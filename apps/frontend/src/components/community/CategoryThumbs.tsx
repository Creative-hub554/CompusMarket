type ThumbProps = { className?: string };

export function AngkorThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="angkorSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd89b" />
          <stop offset="1" stopColor="#f4a261" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#angkorSky)" />
      <circle cx="100" cy="32" r="18" fill="#ffb703" opacity="0.9" />
      <path
        d="M0 140 L0 105 Q40 95 100 105 Q160 95 200 105 L200 140 Z"
        fill="#e76f51"
        opacity="0.35"
      />
      <g fill="#a67c52">
        <rect x="86" y="70" width="8" height="20" rx="2" />
        <rect x="106" y="70" width="8" height="20" rx="2" />
        <rect x="94" y="52" width="12" height="22" rx="2" />
      </g>
      <g fill="#8b5e3c">
        <rect x="58" y="80" width="10" height="24" rx="2" />
        <rect x="132" y="80" width="10" height="24" rx="2" />
        <rect x="46" y="90" width="8" height="14" rx="2" />
        <rect x="146" y="90" width="8" height="14" rx="2" />
      </g>
      <rect x="34" y="100" width="132" height="8" fill="#7a5230" />
      <rect x="40" y="104" width="120" height="10" fill="#6b4527" />
      <g fill="#5c3d21">
        <rect x="34" y="108" width="132" height="10" />
        <rect
          x="0"
          y="118"
          width="200"
          height="8"
          fill="#5c3d21"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}

export function CultureThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="culBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a3a5c" />
          <stop offset="1" stopColor="#0d2137" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#culBg)" />
      <g fill="#f5c542">
        <circle cx="100" cy="46" r="7" />
        <path d="M93 52 L91 44 L97 42 Q100 38 103 42 L109 44 L107 52 Z" />
      </g>
      <g fill="#ffd9a0" opacity="0.95">
        <path d="M92 58 L95 90 L89 96 L111 96 L105 90 L108 58 Z" />
        <circle cx="100" cy="66" r="3" fill="#1a3a5c" opacity="0.4" />
      </g>
      <g fill="#f5c542" opacity="0.9">
        <path d="M82 60 Q74 56 72 50 L88 58 Z" />
        <path d="M118 60 Q126 56 128 50 L112 58 Z" />
      </g>
      <path
        d="M88 96 L84 130 L116 130 L112 96 Z"
        fill="#e74c3c"
        opacity="0.85"
      />
      <path
        d="M80 52 Q76 40 82 32 Q90 26 98 32 Q104 26 112 30"
        fill="none"
        stroke="#f5c542"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="2" fill="#ffd9a0" />
      <circle cx="84" cy="96" r="1.5" fill="#ffd9a0" opacity="0.7" />
      <circle cx="116" cy="96" r="1.5" fill="#ffd9a0" opacity="0.7" />
    </svg>
  );
}

export function FlagThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="140" fill="#f1f5f9" />
      <rect
        x="20"
        y="40"
        width="160"
        height="60"
        fill="#fff"
        stroke="#0f172a"
        strokeWidth="2"
      />
      <rect x="20" y="40" width="160" height="16" fill="#dc2626" />
      <rect x="20" y="84" width="160" height="16" fill="#dc2626" />
      <g fill="#0f172a">
        <rect x="96" y="58" width="8" height="16" rx="2" />
        <rect x="104" y="52" width="8" height="14" rx="2" />
        <rect x="88" y="66" width="8" height="12" rx="2" />
        <rect x="112" y="66" width="8" height="12" rx="2" />
        <rect x="92" y="72" width="16" height="4" rx="1" />
      </g>
      <circle cx="100" cy="112" r="4" fill="#dc2626" />
      <text
        x="100"
        y="124"
        textAnchor="middle"
        fontSize="9"
        fill="#64748b"
        fontWeight="600"
      >
        🇰🇭
      </text>
    </svg>
  );
}

export function ClothingThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="140" fill="#fdf2f8" />
      <g fill="#dc2626">
        <path d="M60 50 L48 40 Q66 28 88 32 L84 44 Z" />
        <path d="M140 50 L152 40 Q134 28 112 32 L116 44 Z" />
        <path d="M60 50 L64 78 L70 90 L90 92 L90 72 Q80 66 74 52 Z" />
        <path d="M140 50 L136 78 L130 90 L110 92 L110 72 Q120 66 126 52 Z" />
        <rect x="90" y="46" width="20" height="24" rx="3" />
        <path d="M70 40 Q100 30 130 40 L128 52 L72 52 Z" />
      </g>
      <path d="M88 32 L100 46 L112 32 Q100 28 88 32 Z" fill="#ffd166" />
      <g stroke="#9a1620" strokeWidth="2" strokeDasharray="3 3">
        <path d="M72 60 Q100 56 128 60" fill="none" />
        <path d="M74 72 Q100 68 126 72" fill="none" />
        <path d="M76 84 Q100 80 124 84" fill="none" />
      </g>
      <circle cx="100" cy="114" r="4" fill="#dc2626" opacity="0.6" />
    </svg>
  );
}

export function FoodThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="140" fill="#fff7ed" />
      <ellipse cx="100" cy="118" rx="52" ry="10" fill="#e2e8f0" />
      <path
        d="M58 62 Q60 34 100 30 Q140 34 142 62 L146 100 Q100 112 54 100 Z"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d="M62 72 Q100 82 138 72"
        stroke="#e2e8f0"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M70 50 Q100 58 130 50"
        stroke="#e2e8f0"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M74 58 Q100 64 126 58"
        stroke="#e2e8f0"
        strokeWidth="2"
        fill="none"
      />
      <g fill="#fb923c">
        <path d="M88 52 Q94 40 100 52 Q94 58 88 52 Z" />
        <path d="M100 48 Q106 36 112 48 Q106 54 100 48 Z" />
        <path d="M80 58 Q86 46 92 58 Q86 64 80 58 Z" />
      </g>
      <g fill="#4ade80">
        <circle cx="108" cy="56" r="3" />
        <circle cx="114" cy="52" r="2" />
        <circle cx="78" cy="54" r="2.5" />
      </g>
      <rect
        x="86"
        y="78"
        width="28"
        height="3"
        rx="1.5"
        fill="#ef4444"
        opacity="0.7"
      />
      <rect
        x="88"
        y="84"
        width="24"
        height="3"
        rx="1.5"
        fill="#f97316"
        opacity="0.7"
      />
      <rect
        x="90"
        y="90"
        width="20"
        height="3"
        rx="1.5"
        fill="#22c55e"
        opacity="0.7"
      />
    </svg>
  );
}

export function NatureThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="natSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#natSky)" />
      <circle cx="160" cy="24" r="12" fill="#fde047" opacity="0.9" />
      <path
        d="M0 100 Q30 80 55 92 Q80 78 110 90 Q140 76 165 88 Q185 80 200 90 L200 140 L0 140 Z"
        fill="#16a34a"
      />
      <path
        d="M0 112 Q40 96 75 106 Q120 94 160 104 Q180 100 200 106 L200 140 L0 140 Z"
        fill="#15803d"
      />
      <path
        d="M0 122 Q50 110 100 118 Q150 110 200 118 L200 140 L0 140 Z"
        fill="#166534"
      />
      <g fill="#134e4a">
        <path d="M90 80 L70 38 L85 30 L100 46 L90 80 Z" />
        <path d="M110 84 L128 40 L113 32 L100 48 L110 84 Z" />
        <path d="M82 44 Q90 36 100 42 Q92 50 82 44 Z" />
      </g>
      <g fill="#1e3a5f">
        <path d="M130 86 L120 58 Q140 52 150 60 Z" />
        <path d="M137 62 Q148 56 152 64 Q140 68 137 62 Z" fill="#134e4a" />
      </g>
      <path
        d="M30 70 Q40 64 46 70"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M38 78 Q48 72 54 78"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

export function PatternThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="140" fill="#faf5f0" />
      <g fill="none" stroke="#c0392b" strokeWidth="2">
        <path d="M0 12 L200 12" opacity="0.6" />
        <path d="M0 132 L200 132" opacity="0.6" />
      </g>
      <g fill="#c0392b">
        <path d="M12 32 Q22 20 32 32 Q22 40 12 32 Z" opacity="0.8" />
        <path d="M52 32 Q62 20 72 32 Q62 40 52 32 Z" opacity="0.8" />
        <path d="M92 32 Q102 20 112 32 Q102 40 92 32 Z" opacity="0.8" />
        <path d="M132 32 Q142 20 152 32 Q142 40 132 32 Z" opacity="0.8" />
        <path d="M172 32 Q182 20 192 32 Q182 40 172 32 Z" opacity="0.8" />
      </g>
      <g fill="none" stroke="#8b5e3c" strokeWidth="2" opacity="0.7">
        <path d="M32 32 L52 32 M72 32 L92 32 M112 32 L132 32 M152 32 L172 32" />
      </g>
      <g fill="#f59e0b">
        <circle cx="20" cy="72" r="5" opacity="0.9" />
        <circle cx="50" cy="60" r="4" opacity="0.8" />
        <circle cx="80" cy="74" r="5" opacity="0.9" />
        <circle cx="110" cy="60" r="4" opacity="0.8" />
        <circle cx="140" cy="74" r="5" opacity="0.9" />
        <circle cx="170" cy="60" r="4" opacity="0.8" />
      </g>
      <g stroke="#8b5e3c" strokeWidth="1.5" fill="none" opacity="0.8">
        <path
          d="M20 56 L20 88 M50 44 L50 76 M80 58 L80 90 M110 44 L110 76 M140 58 L140 90 M170 44 L170 76"
          strokeDasharray="2 3"
        />
      </g>
      <path
        d="M10 100 L190 100"
        stroke="#c0392b"
        strokeWidth="2"
        opacity="0.5"
      />
      <g fill="#a0522d" opacity="0.85">
        <path d="M18 104 L26 96 L34 104 L26 112 Z" />
        <path d="M58 104 L66 96 L74 104 L66 112 Z" />
        <path d="M98 104 L106 96 L114 104 L106 112 Z" />
        <path d="M138 104 L146 96 L154 104 L146 112 Z" />
        <path d="M178 104 L186 96 L194 104 L186 112 Z" />
      </g>
    </svg>
  );
}

export function WildlifeThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wilBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="1" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#wilBg)" />
      <circle cx="150" cy="22" r="14" fill="#fde047" opacity="0.85" />
      <g fill="#64748b">
        <circle cx="58" cy="40" r="3" />
        <path d="M40 44 Q50 30 62 30 Q72 34 66 44 Z" />
      </g>
      <g fill="#94a3b8">
        <circle cx="140" cy="36" r="2.5" />
        <path d="M126 40 Q136 28 148 28 Q156 32 150 40 Z" />
      </g>
      <g fill="#64748b">
        <circle cx="100" cy="38" r="2.5" />
        <path d="M88 42 Q97 30 108 30 Q115 34 110 42 Z" />
      </g>
      <g fill="#475569">
        <ellipse cx="100" cy="66" rx="52" ry="34" />
        <circle cx="80" cy="58" r="5" fill="#1e293b" />
        <circle cx="120" cy="58" r="5" fill="#1e293b" />
        <circle cx="82" cy="56" r="2" fill="#fff" />
        <circle cx="122" cy="56" r="2" fill="#fff" />
        <path d="M74 40 Q68 32 78 30 Q84 28 82 36 Z" fill="#64748b" />
        <path d="M126 40 Q132 32 122 30 Q116 28 118 36 Z" fill="#64748b" />
        <path
          d="M86 74 Q94 86 100 92"
          fill="none"
          stroke="#1e293b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M114 74 Q106 86 100 92"
          fill="none"
          stroke="#1e293b"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g fill="#94a3b8">
        <circle cx="46" cy="70" r="3" opacity="0.7" />
        <circle cx="154" cy="70" r="3" opacity="0.7" />
        <circle cx="40" cy="82" r="2" opacity="0.5" />
        <circle cx="160" cy="82" r="2" opacity="0.5" />
      </g>
      <g fill="#166534">
        <rect x="0" y="116" width="200" height="24" />
        <path d="M10 116 L22 100 L34 116 Z" opacity="0.8" />
        <path d="M60 116 L72 102 L84 116 Z" opacity="0.8" />
        <path d="M120 116 L132 100 L144 116 Z" opacity="0.8" />
        <path d="M170 116 L182 102 L194 116 Z" opacity="0.8" />
      </g>
    </svg>
  );
}

export function ArchitectureThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="archBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#archBg)" />
      <circle cx="40" cy="30" r="10" fill="#fde047" opacity="0.8" />
      <g fill="#8b5e3c">
        <path d="M100 20 L100 30 L96 30 L96 26 L104 26 L104 30 L100 30 Z" />
        <path d="M96 24 L104 24 L104 26 L96 26 Z" />
      </g>
      <path d="M60 70 L100 46 L140 70 Z" fill="#a0522d" />
      <path d="M60 70 L60 112 L140 112 L140 70 Z" fill="#c08552" />
      <path
        d="M60 70 L100 46 L140 70 Z"
        fill="none"
        stroke="#8b5e3c"
        strokeWidth="2"
      />
      <g fill="#8b5e3c">
        <rect x="92" y="34" width="16" height="10" rx="2" />
        <path d="M88 34 L100 26 L112 34 Z" />
      </g>
      <rect x="88" y="92" width="24" height="20" fill="#7a5230" />
      <rect x="92" y="96" width="16" height="16" fill="#3b2415" />
      <g fill="#a0522d">
        <rect x="58" y="80" width="8" height="32" />
        <rect x="134" y="80" width="8" height="32" />
      </g>
      <path d="M56 80 L70 74 L70 80 Z" fill="#8b5e3c" />
      <path d="M130 80 L144 74 L144 80 Z" fill="#8b5e3c" />
      <g fill="#4ade80">
        <rect x="30" y="88" width="4" height="8" rx="2" />
        <rect x="52" y="92" width="4" height="8" rx="2" />
        <rect x="144" y="92" width="4" height="8" rx="2" />
        <rect x="166" y="88" width="4" height="8" rx="2" />
      </g>
      <rect
        x="0"
        y="112"
        width="200"
        height="28"
        fill="#92400e"
        opacity="0.9"
      />
      <rect
        x="0"
        y="116"
        width="200"
        height="24"
        fill="#78350f"
        opacity="0.8"
      />
      <g fill="#b45309" opacity="0.7">
        <rect x="12" y="120" width="30" height="4" rx="2" />
        <rect x="80" y="120" width="30" height="4" rx="2" />
        <rect x="150" y="120" width="30" height="4" rx="2" />
      </g>
    </svg>
  );
}

export function PeopleThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pplBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbcfe8" />
          <stop offset="1" stopColor="#fce7f3" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#pplBg)" />
      <g fill="#475569">
        <circle cx="60" cy="44" r="10" />
        <path d="M44 70 Q46 52 60 52 Q74 52 76 70 L76 84 L44 84 Z" />
        <path d="M52 56 Q54 46 60 46 Q66 46 68 56 Z" fill="#3b4a5f" />
      </g>
      <g fill="#64748b">
        <circle cx="140" cy="46" r="9" />
        <path d="M126 70 Q128 54 140 54 Q152 54 154 70 L154 82 L126 82 Z" />
        <path d="M134 58 Q136 48 140 48 Q144 48 146 58 Z" fill="#4b5b6f" />
      </g>
      <g fill="#334155">
        <circle cx="100" cy="38" r="8" />
        <path d="M88 60 Q90 46 100 46 Q110 46 112 60 L112 72 L88 72 Z" />
        <path d="M94 50 Q96 42 100 42 Q104 42 106 50 Z" fill="#232f3e" />
      </g>
      <path
        d="M40 84 Q70 76 100 80 Q130 84 160 80 L160 88 Q130 92 100 88 Q70 84 40 88 Z"
        fill="#7a5230"
        opacity="0.6"
      />
      <path d="M44 76 Q46 72 48 76 Z" fill="#7a5230" />
      <rect x="44" y="78" width="4" height="6" fill="#dc2626" opacity="0.5" />
      <rect x="146" y="76" width="4" height="6" fill="#dc2626" opacity="0.5" />
      <g fill="#92400e" opacity="0.9">
        <rect x="86" y="108" width="28" height="10" rx="2" />
        <path d="M86 108 L100 100 L114 108 Z" />
        <rect x="58" y="104" width="26" height="9" rx="2" />
        <path d="M58 104 L71 96 L84 104 Z" />
        <rect x="116" y="104" width="26" height="9" rx="2" />
        <path d="M116 104 L129 96 L142 104 Z" />
      </g>
      <path
        d="M60 96 Q100 106 140 96 L140 104 Q100 114 60 104 Z"
        fill="#78350f"
        opacity="0.7"
      />
      <g fill="#fbbf24">
        <circle cx="50" cy="120" r="3" opacity="0.8" />
        <circle cx="80" cy="122" r="2.5" opacity="0.7" />
        <circle cx="120" cy="122" r="2.5" opacity="0.7" />
        <circle cx="150" cy="120" r="3" opacity="0.8" />
      </g>
    </svg>
  );
}

export function ReligiousThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="relBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill="url(#relBg)" />
      <g fill="#b45309">
        <circle cx="100" cy="34" r="11" />
        <path d="M90 46 Q92 42 94 42 L106 42 Q108 42 110 46 L110 52 L90 52 Z" />
        <path d="M92 52 L108 52 L108 60 L92 60 Z" />
        <path d="M94 60 L106 60 L106 68 L94 68 Z" />
        <circle cx="100" cy="34" r="3" fill="#fde68a" />
      </g>
      <path d="M88 70 L112 70 L110 78 L90 78 Z" fill="#d97706" />
      <path d="M78 78 L122 78 L118 86 L82 86 Z" fill="#b45309" />
      <path d="M70 86 L130 86 L126 94 L74 94 Z" fill="#92400e" />
      <path d="M92 86 L108 86 L108 92 L92 92 Z" fill="#78350f" />
      <g fill="#eab308" opacity="0.9">
        <rect x="62" y="70" width="6" height="14" rx="3" />
        <rect x="132" y="70" width="6" height="14" rx="3" />
        <rect x="70" y="78" width="5" height="12" rx="2.5" />
        <rect x="125" y="78" width="5" height="12" rx="2.5" />
      </g>
      <path
        d="M0 130 Q50 118 100 124 Q150 130 200 122 L200 140 L0 140 Z"
        fill="#b45309"
        opacity="0.8"
      />
      <path
        d="M0 136 Q60 126 120 132 Q170 136 200 130 L200 140 L0 140 Z"
        fill="#92400e"
        opacity="0.9"
      />
      <g fill="#fde047">
        <circle cx="30" cy="34" r="3" opacity="0.8" />
        <circle cx="170" cy="30" r="3" opacity="0.8" />
        <circle cx="50" cy="26" r="2" opacity="0.6" />
        <circle cx="150" cy="24" r="2" opacity="0.6" />
      </g>
    </svg>
  );
}

export function IconsThumb({ className }: ThumbProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="140" fill="#eef2ff" />
      <g>
        <rect x="20" y="20" width="34" height="34" rx="8" fill="#b8860b" />
        <rect x="66" y="20" width="34" height="34" rx="8" fill="#0891b2" />
        <rect x="112" y="20" width="34" height="34" rx="8" fill="#059669" />
        <rect x="158" y="20" width="22" height="34" rx="8" fill="#d97706" />
      </g>
      <g fill="#fff" opacity="0.85">
        <circle cx="37" cy="37" r="6" />
        <circle cx="83" cy="37" r="6" />
        <rect x="126" y="31" width="6" height="12" rx="3" />
        <rect x="135" y="31" width="6" height="12" rx="3" />
        <circle cx="169" cy="37" r="5" />
      </g>
      <g>
        <rect x="20" y="70" width="34" height="34" rx="8" fill="#dc2626" />
        <rect x="66" y="70" width="34" height="34" rx="8" fill="#d4a027" />
        <rect x="112" y="70" width="34" height="34" rx="8" fill="#e11d48" />
        <rect x="158" y="70" width="22" height="34" rx="8" fill="#ca8a04" />
      </g>
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M37 76 L37 98" />
        <path d="M26 87 L48 87" />
        <circle cx="83" cy="87" r="7" />
        <circle cx="83" cy="87" r="2" fill="#fff" stroke="none" />
        <path d="M129 74 L135 86 L123 86 Z" fill="#fff" stroke="none" />
        <circle cx="129" cy="94" r="3" fill="#fff" stroke="none" />
        <path d="M169 76 L169 98" />
        <path d="M160 84 Q169 76 178 84" />
      </g>
      <g fill="#654613">
        <path d="M20 116 L30 104 L40 116 L36 120 L24 120 Z" />
        <path d="M80 116 L88 106 L96 116 L92 120 L84 120 Z" />
        <path d="M140 116 L150 104 L160 116 L156 120 L144 120 Z" />
        <rect x="180" y="112" width="8" height="8" rx="2" />
      </g>
    </svg>
  );
}

export const categoryThumbs: Record<
  string,
  (props: ThumbProps) => React.JSX.Element
> = {
  angkor: AngkorThumb,
  culture: CultureThumb,
  flag: FlagThumb,
  clothing: ClothingThumb,
  food: FoodThumb,
  nature: NatureThumb,
  patterns: PatternThumb,
  wildlife: WildlifeThumb,
  architecture: ArchitectureThumb,
  people: PeopleThumb,
  religious: ReligiousThumb,
  icons: IconsThumb,
};
