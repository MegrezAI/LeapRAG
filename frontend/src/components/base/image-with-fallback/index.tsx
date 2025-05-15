import React, { useEffect, useState, forwardRef, type Ref } from 'react';
import Image, { type ImageProps } from 'next/image';

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc: string;
  onComplete?: () => void;
  onError?: () => void;
}

const ImageWithFallback = forwardRef(
  (
    { src, fallbackSrc, onComplete = () => {}, onError, alt, ...rest }: ImageWithFallbackProps,
    ref: Ref<HTMLImageElement>
  ) => {
    const [imgSrc, setImgSrc] = useState(src);
    useEffect(() => {
      setImgSrc(src);
    }, [src]);

    return (
      <Image
        {...rest}
        ref={ref}
        src={imgSrc}
        alt={alt}
        onLoadingComplete={(result) => {
          if (result.naturalWidth === 0) {
            setImgSrc(fallbackSrc);
          }
          onComplete?.();
        }}
        onError={() => {
          setImgSrc(fallbackSrc);
          onError?.();
        }}
      />
    );
  }
);

ImageWithFallback.displayName = 'ImageWithFallback';
export default ImageWithFallback;
