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

            // We don't need to await this
            this.sendPost(i.url, event).catch(ex => {
                this.log.debug(`Failed to dispatch "${event.type}" event to webhook: ${i.url}`);
                this.log.debug(`  -> Error: ${ex?.message ?? String(ex)}`);
                this.log.debug(`  -> Status Text: ${ex?.response?.statusText}`);
            });
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
