import axios from "axios";
import { Server } from "@server";
import { Loggable } from "@server/lib/logging/Loggable";
import { KeypairService } from "@server/services/keypairService";

export type WebhookEvent = {
    type: string;
    data: any;
};

/**
 * Handles dispatching webhooks
 */
export class WebhookService extends Loggable {
    tag = "WebhookService";

    async dispatch(event: WebhookEvent) {
        const webhooks = await Server().repo.getWebhooks();
        for (const i of webhooks) {
            const eventTypes = JSON.parse(i.events) as Array<string>;
            if (!eventTypes.includes("*") && !eventTypes.includes(event.type)) continue;
            this.log.debug(`Dispatching event to webhook: ${i.url}`);

            // For heartbeat events, we need to check the response for relay server deletion
            if (event.type === "heartbeat") {
                this.sendPost(i.url, event)
                    .then(response => {
                        // Check response data for relay server deletion error
                        // Response could be JSON object, string, or nested in data property
                        const responseData = response?.data;
                        const checkForError = (data: any): boolean => {
                            if (!data) return false;
                            const errorStr = typeof data === 'string' 
                                ? data 
                                : JSON.stringify(data);
                            return errorStr.toLowerCase().includes('could not get relay server');
                        };
                        
                        if (checkForError(responseData)) {
                            this.log.warn("Relay server not found - server may have been deleted");
                            Server().emitToUI("relay-server-not-found", {
                                message: "Your relay server no longer exists. Please set up a new relay server."
                            });
                        } else {
                            // Heartbeat successful - relay server exists
                            this.log.debug("Heartbeat successful - relay server is active");
                            Server().emitToUI("relay-server-found", {
                                message: "Relay server is connected and active."
                            });
                        }
                    })
                    .catch(ex => {
                        // Check error response for relay server deletion
                        const errorData = ex?.response?.data;
                        const errorMessage = typeof errorData === 'string' 
                            ? errorData 
                            : errorData?.message || errorData?.error || ex?.message || '';
                        
                        // Check if error message contains the relay server deletion message
                        if (errorMessage.toLowerCase().includes('could not get relay server')) {
                            this.log.warn("Relay server not found - server may have been deleted");
                            Server().emitToUI("relay-server-not-found", {
                                message: "Your relay server no longer exists. Please set up a new relay server."
                            });
                        } else {
                            // Log other errors as debug
                            this.log.debug(`Failed to dispatch "${event.type}" event to webhook: ${i.url}`);
                            this.log.debug(`  -> Error: ${ex?.message ?? String(ex)}`);
                            this.log.debug(`  -> Status Text: ${ex?.response?.statusText}`);
                        }
                    });
            } else {
                // For non-heartbeat events, just log errors
                this.sendPost(i.url, event).catch(ex => {
                    this.log.debug(`Failed to dispatch "${event.type}" event to webhook: ${i.url}`);
                    this.log.debug(`  -> Error: ${ex?.message ?? String(ex)}`);
                    this.log.debug(`  -> Status Text: ${ex?.response?.statusText}`);
                });
            }
        }
    }

    private async sendPost(url: string, event: WebhookEvent) {
        // Get webhook secret from Keychain (preferred) or config (fallback)
        let webhookSecret: string | null = null;
        
        try {
            // Try Keychain first (preferred method)
            webhookSecret = await KeypairService.getWebhookSecret();
            if (webhookSecret) {
                this.log.debug("Using webhook secret from Keychain");
            }
        } catch (error) {
            this.log.debug(`Failed to get webhook secret from Keychain: ${error}`);
        }
        
        // Fallback to config if Keychain fails or is empty
        if (!webhookSecret) {
            try {
                webhookSecret = Server().repo.getConfig("webhook_secret") as string;
                if (webhookSecret) {
                    this.log.debug("Using webhook secret from config (fallback)");
                }
            } catch (error) {
                this.log.debug(`Failed to get webhook secret from config: ${error}`);
            }
        }
        
        // Build headers
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };
        
        // Add webhook secret to headers if available
        if (webhookSecret) {
            headers["X-Webhook-Secret"] = `Bearer ${webhookSecret}`;
        }
        
        return await axios.post(url, event, { headers });
    }
}
