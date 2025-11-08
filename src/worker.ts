console.log("Model worker loaded")
import {
    Florence2ForConditionalGeneration,
    AutoProcessor,
    AutoTokenizer,
    RawImage,
    full,
} from '@huggingface/transformers';

async function hasFp16(): Promise<boolean> {
    try {
        const nav: any = navigator;
        const gpu = nav?.gpu;
        if (!gpu || typeof gpu.requestAdapter !== 'function') return false;
        const adapter = await gpu.requestAdapter();
        return !!(adapter && adapter.features && typeof adapter.features.has === 'function' && adapter.features.has('shader-f16'));
    } catch (e) {
        return false;
    }
}

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class ModelSingleton {
    static model_id = 'onnx-community/Florence-2-base-ft';
    static processor: any;
    static tokenizer: any;
    static supports_fp16: boolean | undefined;
    static model: any;

    static async getInstance(progress_callback?: (x: any) => void): Promise<any[]> {
        this.processor ??= AutoProcessor.from_pretrained(this.model_id);
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id);

        this.supports_fp16 ??= await hasFp16();
        this.model ??= Florence2ForConditionalGeneration.from_pretrained(this.model_id, {
            dtype: {
                embed_tokens: this.supports_fp16 ? 'fp16' : 'fp32',
                vision_encoder: this.supports_fp16 ? 'fp16' : 'fp32',
                encoder_model: 'q4', // or 'fp16' or 'fp32'
                decoder_model_merged: 'q4', // or 'fp16' or 'fp32'
            },
            device: 'webgpu',
            progress_callback: progress_callback ?? undefined,
        });

        return Promise.all([this.model, this.tokenizer, this.processor]);
    }
}


async function load() {
    self.postMessage({
        status: 'loading',
        data: 'Loading model...'
    });

    // Load the pipeline and save it for future use.
    const [model, tokenizer, processor] = await ModelSingleton.getInstance((x: any) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        try { self.postMessage(x); } catch (e) { /* ignore postMessage failures */ }
    });
    console.log("processor", processor)

    self.postMessage({
        status: 'loading',
        data: 'Compiling shaders and warming up model...'
    });

    // Dummy text and vision inputs
    const text_inputs = tokenizer('a');
    const pixel_values = full([1, 3, 768, 768], 0.0);

    // Run model with dummy input to compile shaders
    await model.generate({
        ...text_inputs,
        pixel_values,
        max_new_tokens: 1,
    });

    self.postMessage({ status: 'ready' });
}

const TASKS_WITH_INPUTS = [
    '<CAPTION_TO_PHRASE_GROUNDING>',
    '<MORE_DETAILED_CAPTION>',
]

let vision_inputs: any = null;
let image_size: any = null;
async function run({ text, url, task, language = 'English', conversation = [] }: { text?: string; url: string; task?: string; language?: string; conversation?: string[] }) {
    const [model, tokenizer, processor] = await ModelSingleton.getInstance();

    // Read and preprocess image
    const start = performance.now();
    if (!vision_inputs) {
        // Cache vision inputs when possible
        const image = await RawImage.fromURL(url);
        image_size = image.size;
        vision_inputs = await processor(image);
    }

    // Build an instruction prompt that includes the task, language and conversation
    let user_input = task;
    const convText = Array.isArray(conversation) && conversation.length ? conversation.join('\n') : (text || '');
    if (TASKS_WITH_INPUTS.includes(task) && convText) {
        user_input += '\n' + convText;
    }

    // Add language hint so model focuses on requested language for names
    if (language) {
        user_input += `\nLanguage: ${language}`;
    }

    const prompts = processor.construct_prompts(user_input);
    const text_inputs = tokenizer(prompts);

    // Generate text
    const generated_ids = await model.generate({
        ...text_inputs,
        ...vision_inputs,
        max_new_tokens: 128,
        num_beams: 1,
        do_sample: false,
    });

    // Decode generated text
    const generated_text = tokenizer.batch_decode(generated_ids, { skip_special_tokens: false })[0];

    // Post-process the generated text
    const result = processor.post_process_generation(generated_text, task, image_size);

    const end = performance.now();

    self.postMessage({ status: 'complete', result, time: end - start });
}

// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'load':
                await load();
                break;

            case 'run':
                await run(data);
                break;

            case 'reset':
                vision_inputs = image_size = null;
                break;
        }
    } catch (err) {
        try {
            const msg = (err as any)?.message ?? String(err);
            self.postMessage({ status: 'error', message: msg });
        } catch (postErr) {
            // ignore
        }
        console.error('Worker message handler error', err);
    }
});
