import { Level } from "level";
declare class VoiceQueue {
    db: Level<string, Array<any>>;
    constructor();
    enqueueMessage(guildId: any, text: any): Promise<void>;
    dequeueMessage(guildId: any): Promise<any>;
    getQueue(guildId: any): Promise<any[]>;
    clearQueue(guildId: any): Promise<void>;
    isEmpty(guildId: any): Promise<boolean>;
}
export default VoiceQueue;
//# sourceMappingURL=voiceQueue.d.ts.map