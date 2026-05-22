"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function SearchBar({ initialPosition = "", initialCity = "" }) {
  const [position, setPosition] = useState(initialPosition);
  const [city, setCity] = useState(initialCity);
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showPosSuggestions, setShowPosSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const router = useRouter();
  const posTimer = useRef(null);
  const cityTimer = useRef(null);

  // Auto-fill city from browser geolocation
  useEffect(() => {
    if (!initialCity && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=tr`
          );
          const data = await res.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            "";
          if (cityName) setCity(cityName);
        } catch {
          // ignore geolocation errors
        }
      });
    }
  }, []);

  const handlePositionChange = (val) => {
    setPosition(val);
    clearTimeout(posTimer.current);
    if (val.length >= 2) {
      posTimer.current = setTimeout(async () => {
        const { data } = await apiClient.autocomplete(val, "position");
        setPositionSuggestions(data || []);
        setShowPosSuggestions(true);
      }, 300);
    } else {
      setPositionSuggestions([]);
      setShowPosSuggestions(false);
    }
  };

  const handleCityChange = (val) => {
    setCity(val);
    clearTimeout(cityTimer.current);
    if (val.length >= 2) {
      cityTimer.current = setTimeout(async () => {
        const { data } = await apiClient.autocomplete(val, "city");
        setCitySuggestions(data || []);
        setShowCitySuggestions(true);
      }, 300);
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (position) params.set("position", position);
    if (city) params.set("city", city);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-3xl">
      {/* Position input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={position}
          onChange={(e) => handlePositionChange(e.target.value)}
          onFocus={() => positionSuggestions.length && setShowPosSuggestions(true)}
          onBlur={() => setTimeout(() => setShowPosSuggestions(false), 150)}
          placeholder="Pozisyon veya anahtar kelime"
          className="input-base pl-9"
        />
        {showPosSuggestions && positionSuggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-48 overflow-y-auto">
            {positionSuggestions.map((s) => (
              <li
                key={s}
                onMouseDown={() => {
                  setPosition(s);
                  setShowPosSuggestions(false);
                }}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* City input */}
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          onFocus={() => citySuggestions.length && setShowCitySuggestions(true)}
          onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
          placeholder="Şehir veya ilçe"
          className="input-base pl-9"
        />
        {showCitySuggestions && citySuggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-48 overflow-y-auto">
            {citySuggestions.map((s) => (
              <li
                key={s}
                onMouseDown={() => {
                  setCity(s);
                  setShowCitySuggestions(false);
                }}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleSearch} className="btn-primary flex items-center gap-2 whitespace-nowrap">
        <Search className="w-4 h-4" />
        İş Bul
      </button>
    </div>
  );
}
