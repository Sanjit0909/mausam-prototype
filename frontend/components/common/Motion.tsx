"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hook to detect whether the user has requested reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  return reducedMotion;
}

/**
 * Smoothly interpolates and renders a temperature or numeric value.
 * Avoids jarring instant jumps when switching cities or refreshing data,
 * without cartoonish slot-machine rolling.
 */
export function AnimatedTemperature({
  value,
  suffix = "°",
  className = "",
  formatFn,
}: {
  value: number;
  suffix?: string;
  className?: string;
  formatFn?: (val: number) => string;
}) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    const duration = 400; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quad ease-out for calm, natural settling
      const ease = 1 - (1 - progress) * (1 - progress);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(Math.round(current));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, reducedMotion]);

  const formatted = formatFn ? formatFn(displayValue) : `${displayValue}${suffix}`;

  return (
    <span
      className={`tabular-nums transition-opacity duration-200 ${className}`}
      aria-label={`${value}${suffix}`}
    >
      {formatted}
    </span>
  );
}

/**
 * Lightweight scroll reveal wrapper using IntersectionObserver.
 * Triggers once when scrolled into view.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  yOffset = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (domRef.current) observer.unobserve(domRef.current);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const el = domRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={domRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${yOffset}px)`,
        transition: `opacity 450ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 450ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Container that automatically sequences staggered entrance animations for child elements.
 */
export function StaggerContainer({
  children,
  className = "",
  staggerMs = 60,
  initialDelayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
  initialDelayMs?: number;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        const delay = initialDelayMs + idx * staggerMs;
        return (
          <div
            style={{
              animation: `fade-in-up 450ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
