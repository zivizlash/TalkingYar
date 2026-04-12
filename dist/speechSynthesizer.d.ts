declare class SpeechSynthesizer {
    private voicesMap;
    constructor(baseUrl?: string);
    generateWithRetries(text: string): Promise<any>;
    private generateVoiceWithRetry;
    private createAudioResourceFromBlob;
}
export { SpeechSynthesizer };
//# sourceMappingURL=speechSynthesizer.d.ts.map