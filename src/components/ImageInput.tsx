import { useState, useRef } from 'react';

const EXAMPLE_URL = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=example';

interface ImageInputProps extends React.HTMLAttributes<HTMLDivElement> {
  onImageChange?: (file: File | null, result: string) => void;
}

const ImageInput = ({ onImageChange, ...props }: ImageInputProps) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const readFile = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            if (onImageChange) {
                onImageChange(file, result);
            }
        };
        reader.readAsDataURL(file);
    }

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) readFile(file);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) readFile(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            {...props}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden"
            />
            {imagePreview ? (
                <img src={imagePreview} alt="Selected" className="w-full max-h-[250px] h-full object-contain rounded-md" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4">
                    <span className="text-gray-600 text-center m-3"><u>Drag & drop</u> or <u>click</u><br />to upload a pet photo</span>
                    <span className="text-gray-500 text-sm hover:text-gray-800 mt-2" onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(EXAMPLE_URL);
                        if (onImageChange) onImageChange(null, EXAMPLE_URL);
                    }}>(or <u>try an example</u>)</span>
                </div>
            )}
        </div>
    );
};

export default ImageInput;
