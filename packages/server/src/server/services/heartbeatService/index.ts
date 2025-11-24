import { Server } from "@server";
import { Loggable } from "@server/lib/logging/Loggable";
import { waitMs } from "@server/helpers/utils";
import { GeneralInterface } from "@server/api/interfaces/generalInterface";
import { app } from "electron";
import macosVersion from "macos-version";

const osVersion = macosVersion();

export interface HeartbeatData {
    timestamp: number;
    server_id: string | null;
    device_id: string | null;
    server_version: string;
    os_version: string;
    computer_id: string;
    private_api: {
        enabled: boolean;
        connected: boolean;
    };
    proxy_service: string | null;
    server_status: {
        running: boolean;
        uptime_seconds: number;
    };
    health: {
        has_disk_access: boolean;
        messages_running: boolean;
        icloud_account: string | null;
        imessage_account: string | null;
    };
}

/**
 * HeartbeatService - Sends periodic health check webhooks to the configured endpoint
 * Runs every 5 minutes and sends server health metrics for admin/debugging purposes
 */
export class HeartbeatService extends Loggable {
    tag = "HeartbeatService";
    private intervalId: NodeJS.Timeout | null = null;
    private startTime: number = Date.now();
    private isRunning: boolean = false;

    /**
     * Start the heartbeat service
     * Sends heartbeat every 5 minutes (300,000 ms)
     */
    public start(): void {
        if (this.isRunning) {
            this.log.warn("Heartbeat service is already running");
            return;
        }

        this.startTime = Date.now();
        this.isRunning = true;
        this.log.info("Starting heartbeat service (interval: 5 minutes)");

        // Send initial heartbeat after 30 seconds (to avoid startup spam)
        setTimeout(() => {
            this.sendHeartbeat();
        }, 30000);

        // Then send every 5 minutes
        this.intervalId = setInterval(() => {
            this.sendHeartbeat();
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop the heartbeat service
     */
    public stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.log.info("Heartbeat service stopped");
    }

    /**
     * Collect health metrics and send heartbeat webhook
     */
    private async sendHeartbeat(): Promise<void> {
        try {
            const server = Server();
            
            // Only send heartbeat if setup is complete
            const tutorialDone = server.repo?.getConfig("tutorial_is_done") as boolean;
            if (!tutorialDone) {
                this.log.debug("Setup not complete, skipping heartbeat");
                return;
            }
            
            const heartbeatData = await this.collectHealthMetrics();
            
            // Send heartbeat event via webhook service
            if (server.webhookService) {
                server.webhookService.dispatch({
                    type: "heartbeat",
                    data: heartbeatData
                });
                this.log.debug("Heartbeat sent successfully");
            } else {
                this.log.warn("Webhook service not available, skipping heartbeat");
            }
        } catch (error: any) {
            this.log.error(`Failed to send heartbeat: ${error?.message ?? String(error)}`);
        }
    }

    /**
     * Collect all health metrics for the heartbeat
     */
    private async collectHealthMetrics(): Promise<HeartbeatData> {
        const server = Server();
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

        // Get server metadata
        const metadata = await GeneralInterface.getServerMetadata();
        
        // Check if Messages app is running
        const messagesRunning = await GeneralInterface.isMessagesRunning();

        // Get device ID from Keychain (if available)
        let deviceId: string | null = null;
        try {
            const { KeypairService } = await import("@server/services/keypairService");
            deviceId = await KeypairService.getDeviceId();
        } catch (error) {
            // Ignore if keypair service not available
        }

        // Get server ID from config - same pattern as other configs like tutorial_is_done
        const serverIdValue = server.repo.getConfig("server_id");
        const serverId = serverIdValue && String(serverIdValue).trim() !== "" ? String(serverIdValue).trim() : null;

        return {
            timestamp: Date.now(),
            server_id: serverId,
            device_id: deviceId,
            server_version: metadata.server_version,
            os_version: metadata.os_version,
            computer_id: metadata.computer_id,
            private_api: {
                enabled: metadata.private_api,
                connected: metadata.helper_connected
            },
            proxy_service: metadata.proxy_service || null,
            server_status: {
                running: server.hasStarted,
                uptime_seconds: uptimeSeconds
            },
            health: {
                has_disk_access: server.hasDiskAccess,
                messages_running: messagesRunning,
                icloud_account: metadata.detected_icloud || null,
                imessage_account: metadata.detected_imessage || null
            }
        };
    }
}

