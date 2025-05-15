import { useEffect, useRef } from 'react';

type Dimensions = {
  width: number;
  height: number;
};

type UseDimensions = (ref: React.RefObject<HTMLElement>) => Dimensions;

export const useDimensions: UseDimensions = (ref) => {
  const dimensions = useRef<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    if (ref.current) {
      dimensions.current.width = ref.current.offsetWidth;
      dimensions.current.height = ref.current.offsetHeight;
    }
  }, [ref]);

  return dimensions.current;
};
