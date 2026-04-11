import { Level } from "level";
class VoiceQueue {
    db;
    constructor() {
        this.db = new Level("./voice-queues", { valueEncoding: "json" });
    }
    async enqueueMessage(guildId, text) {
        const queue = await this.getQueue(guildId);
        queue.push(text);
        await this.db.put(guildId, queue);
    }
    async dequeueMessage(guildId) {
        const queue = await this.getQueue(guildId);
        const message = queue.shift();
        await this.db.put(guildId, queue);
        return message;
    }
    async getQueue(guildId) {
        try {
            const queue = await this.db.get(guildId);
            return queue;
        }
        catch (error) {
            if (error.type === "NotFoundError") {
                return [];
            }
            throw error;
        }
    }
    async clearQueue(guildId) {
        await this.db.del(guildId);
    }
    async isEmpty(guildId) {
        const queue = await this.getQueue(guildId);
        return queue.length === 0;
    }
}
export default VoiceQueue;
//# sourceMappingURL=voiceQueue.js.map