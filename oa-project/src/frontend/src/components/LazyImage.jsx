/**
 * 图片懒加载组件
 */

import React, { useState, useEffect, useRef } from 'react';

const LazyImage = ({ src, alt, placeholder, style, className, ...props }) => {
  const [imageSrc, setImageSrc] = useState(placeholder || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle"%3E加载中...%3C/text%3E%3C/svg%3E');
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isLoading) {
            setImageSrc(src);
            setIsLoading(false);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, isLoading]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      style={{ ...style, opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
      className={className}
      {...props}
    />
  );
};

export default LazyImage;
