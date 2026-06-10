"use client";

import { useEffect, useMemo, useState } from "react";

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export default function HeroTypewriter({ words, fallback = "Social media management", className = "" }) {
  const rotationWords = useMemo(() => {
    const parsed = toStringArray(words);
    return parsed.length ? parsed : [fallback];
  }, [words, fallback]);
  const maxWordLength = useMemo(
    () =>
      rotationWords.reduce((longest, word) => {
        const length = String(word || "").length;
        return length > longest ? length : longest;
      }, String(fallback || "").length),
    [fallback, rotationWords]
  );

  const [dynamicWordIndex, setDynamicWordIndex] = useState(0);
  const [typedDynamicWord, setTypedDynamicWord] = useState("");
  const [isDeletingDynamicWord, setIsDeletingDynamicWord] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(media.matches);
    };

    handleChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    setDynamicWordIndex(0);
    setTypedDynamicWord("");
    setIsDeletingDynamicWord(false);
  }, [rotationWords]);

  useEffect(() => {
    if (!rotationWords.length) {
      setDynamicWordIndex(0);
      setTypedDynamicWord("");
      setIsDeletingDynamicWord(false);
      return undefined;
    }

    const currentWord = rotationWords[dynamicWordIndex % rotationWords.length] || "";

    if (prefersReducedMotion) {
      setTypedDynamicWord(currentWord);
      setIsDeletingDynamicWord(false);
      return undefined;
    }

    const baseTypingSpeed = isDeletingDynamicWord ? 45 : 85;
    let timer;

    if (!isDeletingDynamicWord && typedDynamicWord.length < currentWord.length) {
      timer = setTimeout(() => {
        setTypedDynamicWord(currentWord.slice(0, typedDynamicWord.length + 1));
      }, baseTypingSpeed);
    } else if (!isDeletingDynamicWord && typedDynamicWord.length === currentWord.length) {
      timer = setTimeout(() => {
        setIsDeletingDynamicWord(true);
      }, 950);
    } else if (isDeletingDynamicWord && typedDynamicWord.length > 0) {
      timer = setTimeout(() => {
        setTypedDynamicWord(currentWord.slice(0, typedDynamicWord.length - 1));
      }, 35);
    } else {
      timer = setTimeout(() => {
        setIsDeletingDynamicWord(false);
        setDynamicWordIndex((current) => (current + 1) % rotationWords.length);
      }, 220);
    }

    return () => clearTimeout(timer);
  }, [dynamicWordIndex, isDeletingDynamicWord, prefersReducedMotion, rotationWords, typedDynamicWord]);

  const activeWord = rotationWords[dynamicWordIndex % rotationWords.length] || fallback;
  const displayedWord = typedDynamicWord || activeWord;
  const dynamicWordWidthCh = Math.max(8, maxWordLength + 1);

  return (
    <span className={className} style={{ "--lp-hero-dynamic-width": `${dynamicWordWidthCh}ch` }}>
      {displayedWord}
    </span>
  );
}
