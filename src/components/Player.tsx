// src/components/SpotifyPlayer.tsx
import { useEffect, useRef, useState } from "react";

export default function Player() {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const height = isMobile ? "80" : "152";
  const width = isMobile ? "100%" : "60%";

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <iframe
        data-testid="embed-iframe"
        style={{ borderRadius: isMobile ? 0 : 12 }}
        src="https://open.spotify.com/embed/track/66ehTkoVaEQlX5GyieRCsd?utm_source=generator&theme=0"
        width={width}
        height={height}
        allow=" clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    </div>
  );
}
