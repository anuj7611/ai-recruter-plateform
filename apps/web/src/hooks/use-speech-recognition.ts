"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const speechErrorMessage = (error: string) => {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied. Allow microphone access in your browser settings.";
    case "audio-capture":
      return "No working microphone was found.";
    case "network":
      return "Speech recognition could not connect. Check your internet connection.";
    case "no-speech":
      return "No speech was detected. Try again and speak clearly.";
    case "aborted":
      return "";
    default:
      return "Speech recognition stopped unexpectedly. Please try again.";
  }
};

export function useSpeechRecognition(
  onFinalTranscript: (transcript: string) => void,
) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptHandlerRef = useRef(onFinalTranscript);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechError, setSpeechError] = useState("");

  useEffect(() => {
    transcriptHandlerRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      return;
    }

    const supportTimer = window.setTimeout(() => setIsSupported(true), 0);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";

        if (result?.isFinal) finalText += transcript;
        else interimText += transcript;
      }

      setInterimTranscript(interimText.trim());

      const normalizedFinalText = finalText.trim();
      if (normalizedFinalText) {
        transcriptHandlerRef.current(normalizedFinalText);
      }
    };

    recognition.onerror = (event) => {
      setSpeechError(speechErrorMessage(event.error));
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      window.clearTimeout(supportTimer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setSpeechError("");
    setInterimTranscript("");

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setSpeechError("The microphone is already starting. Please try again.");
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
  }, [isListening]);

  const clearSpeechError = useCallback(() => setSpeechError(""), []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    clearSpeechError,
  };
}
