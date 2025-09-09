import { useEffect, useRef, useState } from "react";
import style from "./Styles.module.css";

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const scale = isMobile ? 0.7 : 1;

  const [runningUI, setRunningUI] = useState(true);
  const [started, setStarted] = useState(false);

  type Obstacle = {
    x: number;
    y: number;
    width: number;
    height: number;
    type: "maple" | "microondas" | "sillon" | "tv";
  };

  const imagesRef = useRef<{
    huevo: HTMLImageElement;
    maple: HTMLImageElement;
    fondo: HTMLImageElement;
    microondas: HTMLImageElement;
    sillon: HTMLImageElement;
    tv: HTMLImageElement;
  } | null>(null);

  const stateRef = useRef<{
    ready: boolean;
    running: boolean;
    speed: number;
    groundTop: number;
    groundX: number;
    huevo: {
      x: number;
      y: number;
      width: number;
      height: number;
      vy: number;
      gravity: number;
      jumpForce: number;
    };
    obstacles: Obstacle[];
    score: number;
    lastSpeedUp: number;
  }>({
    ready: false,
    running: true,
    speed: 5,
    groundTop: isMobile ? 250 : 300, // dibujamos el suelo desde 260 hacia abajo (alto 40)
    groundX: 0,
    huevo: {
      x: 250,
      // y inicial = top del dino apoyado en el suelo: groundTop - height
      y: isMobile ? 250 - (80 * scale) : 220, // 260 - 50
      width: 65 * scale,
      height: 80 * scale,
      vy: 0,
      gravity: isMobile ? 0.7 : 0.6,
      jumpForce: -15,
    },
    obstacles: [
      {
        x: isMobile ? 300 : 600,
        y: isMobile ? 70 : 110,
        width: 70 * scale,
        height: 70 * scale,
        type: "maple",
      },
    ],
    score: 0,
    lastSpeedUp: 0,
  });

  // Utilidad: AABB
  function collide(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width - 10 &&
      a.x + a.width - 10 > b.x &&
      a.y < b.y + b.height - 10 &&
      a.y + a.height - 10 > b.y
    );
  }

  function jump() {
    const s = stateRef.current;
    if (!s.running) return;
    // Solo salta si está en el suelo (tolerancia pequeña)
    const onGround = Math.abs(s.huevo.y - (s.groundTop - s.huevo.height)) < 0.5;
    if (onGround) {
      s.huevo.vy = s.huevo.jumpForce;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = isMobile ? window.innerWidth : 800;
    canvas.height = isMobile ? 300 : 400;

    // Cargar imágenes y arrancar cuando estén listas
    const huevoImg = new Image();
    const mapleImg = new Image();
    const microondasImg = new Image();
    const sillonImg = new Image();
    const tvImg = new Image();
    const fondoImg = new Image();

    let loaded = 0;
    const onLoad = () => {
      loaded += 1;
      if (loaded === 3) {
        imagesRef.current = {
          huevo: huevoImg,
          maple: mapleImg,
          fondo: fondoImg,
          tv: tvImg,
          microondas: microondasImg,
          sillon: sillonImg,
        };
        stateRef.current.ready = true;
        loop();
      }
    };

    huevoImg.onload = onLoad;
    mapleImg.onload = onLoad;
    microondasImg.onload = onLoad;
    sillonImg.onload = onLoad;
    tvImg.onload = onLoad;
    fondoImg.onload = onLoad;

    // Alternar entre dos imágenes de huevo cada 500ms
    let huevoToggle = true;
    huevoImg.src = "/sprites/huevo1.png";
    setInterval(() => {
      if (runningUI && started && stateRef.current.running) {
        huevoImg.src = huevoToggle
          ? "/sprites/huevo2.png"
          : "/sprites/huevo1.png";
        huevoToggle = !huevoToggle;
      }
    }, 500);
    mapleImg.src = "/sprites/maple.png";
    microondasImg.src = "/sprites/microondas.png";
    sillonImg.src = "/sprites/sillon.png";
    tvImg.src = "/sprites/tv.png";
    fondoImg.src = "/sprites/fondo.png";

    // Controles: teclado y táctil/click
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    const onPointer = () => (stateRef.current.running ? jump() : "");
    canvas.addEventListener("pointerdown", onPointer);

    function update() {
      if (!started) return;

      const s = stateRef.current;
      if (!s.running || !s.ready) return;

      // Física del dino
      s.huevo.y += s.huevo.vy;
      s.huevo.vy += s.huevo.gravity;
      // Limitar al suelo
      const groundY = s.groundTop - s.huevo.height; // 210
      if (s.huevo.y > groundY) {
        s.huevo.y = groundY;
        s.huevo.vy = 0;
      }

      // Mover fondo
      s.groundX -= s.speed;
      if (s.groundX <= -canvas.width) s.groundX = 0;

      // Mover obstáculos
      for (const obs of s.obstacles) {
        obs.x -= s.speed;
        if (obs.x + obs.width < 0) {
          const types: Obstacle["type"][] = [
            "maple",
            "microondas",
            "sillon",
            "tv",
          ];
          const newType = types[Math.floor(Math.random() * types.length)];
          obs.type = newType;

          // cambiar ancho según el tipo
          if (newType === "maple") {
            obs.width = 70 * scale;
            obs.height = 70 * scale;
            obs.y = isMobile ? 70 : 110;
          }
          if (newType === "microondas") {
            obs.width = 80 * scale;
            obs.height = 50 * scale;
            obs.y = isMobile ? 200 : 255;
          }
          if (newType === "sillon") {
            obs.width = 120 * scale;
            obs.height = 70 * scale;
            obs.y = isMobile ? 200 : 240;
          }
          if (newType === "tv") {
            obs.width = 80 * scale;
            obs.height = 65 * scale;
            obs.y = isMobile ? 200 : 240;
          }

          obs.x = canvas.width + 100 + Math.random() * 400;
        }
      }

      // Colisiones (hitbox del cactus ligeramente más chico)
      for (const obs of s.obstacles) {
        const hitbox = {
          x: obs.x,
          y: obs.y,
          width: obs.width - 20,
          height: obs.height,
        };
        if (collide(s.huevo, hitbox)) {
          s.running = false;
          setRunningUI(false);
          break;
        }
      }

      // Aumentar score / dificultad leve
      s.score += 0.5;
      if (s.score - s.lastSpeedUp >= 100) {
        s.speed = Math.min(s.speed + 0.5, 20);
        s.lastSpeedUp = s.score; // guardar el último momento de aceleración
      }
    }

    function draw() {
      const s = stateRef.current;
      const imgs = imagesRef.current!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo completo (rellena todo el canvas)
      ctx.drawImage(imgs.fondo, 0, 0, canvas.width, canvas.height);

      // Huevo
      ctx.drawImage(
        imgs.huevo,
        s.huevo.x,
        s.huevo.y,
        s.huevo.width,
        s.huevo.height
      );

      // Obstáculos
      for (const obs of s.obstacles) {
        let img: HTMLImageElement;
        switch (obs.type) {
          case "maple":
            img = imgs.maple;
            break;
          case "microondas":
            img = imgs.microondas;
            break;
          case "sillon":
            img = imgs.sillon;
            break;
          case "tv":
            img = imgs.tv;
            break;
          default:
            img = imgs.maple;
        }
        ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
      }

      // UI mínima: score
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText(`Puntaje: ${Math.floor(s.score)}`, canvas.width - 120, 24);

      if (!s.running) {
        // Guardar puntaje máximo en localStorage
        const currentScore = Math.floor(s.score);
        const maxScore = Math.max(
          currentScore,
          Number(localStorage.getItem("maxScore") || 0)
        );
        localStorage.setItem("maxScore", String(maxScore));

        // Overlay simple de Game Over
        ctx.font = isMobile
          ? "bold 22px system-ui, sans-serif"
          : "bold 28px system-ui, sans-serif";
        ctx.fillText(
          "¡Juego terminado! Puntaje: " + currentScore,
          50,
          80
        );
        ctx.font = isMobile
          ? "bold 18px system-ui, sans-serif"
          : "bold 22px system-ui, sans-serif";
        ctx.fillText(
          "Puntaje máximo: " + maxScore,
          50,
          110
        );
      }
    }

    const loop = () => {
      update();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, [started]);

  return (
    <div>
      <div className={style.container}>
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #000",
            touchAction: "manipulation",
            background: "turquoise",
          }}
        />
        {runningUI ? (
          <p className={style.instrucciones}>
            {isMobile ? "Pulsar" : "Clickear o apretar espacio"} sobre el juego
            para saltar
          </p>
        ) : (
          <button
            style={{ display: "none" }}
            onClick={() => {
              stateRef.current.running = false; /* ya está en false */
              stateRef.current.ready ? undefined : undefined;
              setRunningUI(false);
            }}
          />
        )}
        {!runningUI && (
          <button
            style={{ display: "none" }}
            onClick={() => {
              const s = stateRef.current;
              s.running = false;
            }}
          />
        )}
        {!runningUI && (
          <button
            style={{ width: canvasRef.current?.width || 802 }}
            className={style.button}
            onClick={() => {
              /* botón visible para reintentar desde la UI */ (function () {
                const s = stateRef.current;
                if (!s.running) {
                  const canvas = canvasRef.current!;
                  const ctx = canvas.getContext("2d")!; // Limpio pantalla opcional
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              })();
              // Llamamos al reinicio formal
              (function () {
                const s = stateRef.current;
                s.running = true;
                setRunningUI(true);
                s.speed = 5;
                s.groundX = 0;
                s.huevo.x = 250;
                s.huevo.y = s.groundTop - s.huevo.height;
                s.huevo.vy = 0;
                (s.obstacles = [
                  {
                    x: isMobile ? 300 : 600,
                    y: isMobile ? 70 : 110,
                    width: 70 * scale,
                    height: 70 * scale,
                    type: "maple",
                  },
                ]),
                  (s.score = 0);
              })();
            }}
          >
            Reintentar
          </button>
        )}
      </div>
      {!started && (
        <button
          className={style.button}
          style={{ width: isMobile ? "100%" : 300, marginBottom: 20 }}
          onClick={() => setStarted(true)}
        >
          Iniciar
        </button>
      )}
    </div>
  );
}
