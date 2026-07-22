import { Link } from 'react-router-dom';
import logoUrl from '../assets/logo/stacksave-logo.svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  asDiv?: boolean;
}

export default function Logo({ size = 'md', className = '', asDiv = false }: LogoProps) {
  let imgSizeClass = 'h-9 md:h-[40px] lg:h-[44px] w-auto'; // md default

  if (size === 'sm') {
    imgSizeClass = 'h-6 md:h-7 lg:h-8 w-auto';
  } else if (size === 'lg') {
    // Redesign specifications for the main header (44-52px)
    imgSizeClass = 'h-[44px] md:h-[48px] lg:h-[52px] w-auto';
  }

  const content = (
    <img src={logoUrl} alt="StackSave Logo" className={`${imgSizeClass} object-contain`} />
  );

  const containerClasses = `flex items-center ${className}`;

  if (asDiv) {
    return <div className={containerClasses}>{content}</div>;
  }

  return (
    <Link to="/" className={containerClasses} aria-label="StackSave home">
      {content}
    </Link>
  );
}
