import { Client } from "@gradio/client";
import fs from "fs";
import { Blob } from "buffer";

let soundRef = null;

const getRef = () => {
  if (soundRef === null) {
    const buffer = fs.readFileSync('example.wav');
    const blob = new Blob([buffer]);
    soundRef = blob;
  }

  return soundRef;
};

class SpeechSynthesizer {
  async generate(text) {    
    // const response_0 = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav");
    // const exampleAudio = await response_0.blob();

    const referenceAudio = getRef();
    const referenceText = 'Ярослав, посмотри игру, пожалуйста. Пожалуйста. Мне кажется, там прикольный кооператив, и как будто бы мы сможем даже втроём поиграть, если что вдруг, если кто-то больше не захочет. Вот.';

    const client = await Client.connect("http://127.0.0.1:7860");

    const result = await client.predict("/synthesize", {
        ref_audio: referenceAudio,
        ref_text: referenceText,
        gen_text: text,
        remove_silence: false,
        seed: -1,
        cross_fade_duration: 0.15,
        nfe_step: 48,
        speed: 1.0,
    }); 

    const audioFilePath = result.data[0].path;

    const file = fs.readFileSync(audioFilePath);
    const arrayBuffer = Buffer.copyBytesFrom(file);

    fs.writeFileSync('received.wav', arrayBuffer);
    return result.data;
  }
}

export default SpeechSynthesizer;
