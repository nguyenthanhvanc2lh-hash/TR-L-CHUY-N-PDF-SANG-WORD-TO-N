import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
    content: string;
    className?: string;
    isHtml?: boolean;
}

declare global {
    interface Window {
        MathJax: any;
    }
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className, isHtml = false }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const typeset = () => {
            if (window.MathJax && typeof window.MathJax.typesetPromise === 'function' && ref.current) {
                // Clear any previous processing if needed, though MathJax usually handles updates well.
                window.MathJax.typesetPromise([ref.current])
                    .catch((err: any) => console.error('MathJax typeset failed:', err));
            }
        };

        typeset();
    }, [content]);

    if (isHtml) {
        return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return <div ref={ref} className={className}>{content}</div>;
};