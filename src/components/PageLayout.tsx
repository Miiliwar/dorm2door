import React from 'react';

interface PageLayoutProps {
    children: React.ReactNode;
    backgroundImage: string;
}

const PageLayout = ({ children, backgroundImage }: PageLayoutProps) => {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden text-white">
            {/* Background Image */}
            <img
                src={backgroundImage}
                alt="background"
                className="full-bg"
            />

            {/* Overlay for readability */}
            <div className="page-overlay" />

            {/* Content */}
            <div className="relative z-10 w-full min-h-screen flex flex-col">
                {children}
            </div>
        </div>
    );
};

export default PageLayout;
