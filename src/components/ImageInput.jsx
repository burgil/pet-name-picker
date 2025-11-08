import { useState, useRef } from 'react';

const EXAMPLE_URL = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=example';

const ImageInput = ({ onImageChange, ...props }) => {
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const readFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            if (onImageChange) {
                onImageChange(file, reader.result);
            }
        };
        reader.readAsDataURL(file);
    }

    const handleImageChange = (event) => {
        readFile(event.target.files[0]);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        readFile(event.dataTransfer.files[0]);
    };

    const handleClick = () => {
        fileInputRef.current.click();
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
                        onImageChange(null, EXAMPLE_URL);
                    }}>(or <u>try an example</u>)</span>
                </div>
            )}
        </div>
    );
};

export default ImageInput;
