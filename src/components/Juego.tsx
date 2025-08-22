import { useEffect, useRef, useState } from "react";
import style from "./Styles.module.css";

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  const [runningUI, setRunningUI] = useState(true);

  type Obstacle = {
    x: number;
    y: number;
    width: number;
    height: number;
    type: "cactus";
  };

  const imagesRef = useRef<{
    dino: HTMLImageElement;
    cactus: HTMLImageElement;
    ground: HTMLImageElement;
  } | null>(null);

  const stateRef = useRef<{
    ready: boolean;
    running: boolean;
    speed: number;
    groundTop: number;
    groundX: number;
    dino: {
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
  }>({
    ready: false,
    running: true,
    speed: 5,
    groundTop: 260, // dibujamos el suelo desde 260 hacia abajo (alto 40)
    groundX: 0,
    dino: {
      x: 50,
      // y inicial = top del dino apoyado en el suelo: groundTop - height
      y: 210, // 260 - 50
      width: 50,
      height: 50,
      vy: 0,
      gravity: 1,
      jumpForce: -15,
    },
    obstacles: [
      {
        x: isMobile ? 200 : 600,
        y: 210,
        width: 40,
        height: 50,
        type: "cactus",
      }, // apoyado en el suelo: 260-50=210
    ],
    score: 0,
  });

  // Utilidad: AABB
  function collide(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function jump() {
    const s = stateRef.current;
    if (!s.running) return;
    // Solo salta si está en el suelo (tolerancia pequeña)
    const onGround = Math.abs(s.dino.y - (s.groundTop - s.dino.height)) < 0.5;
    if (onGround) {
      s.dino.vy = s.dino.jumpForce;
    }
  }

  function restart() {
    const s = stateRef.current;
    s.running = true;
    setRunningUI(true);
    s.speed = 5;
    s.groundX = 0;
    s.dino.x = 50;
    s.dino.y = s.groundTop - s.dino.height; // 210
    s.dino.vy = 0;
    s.obstacles = [
      { x: 600, y: s.groundTop - 50, width: 40, height: 50, type: "cactus" },
    ];
    s.score = 0;
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = isMobile ? window.innerWidth : 800;
    canvas.height = 300;

    // Cargar imágenes y arrancar cuando estén listas
    const dinoImg = new Image();
    const cactusImg = new Image();
    const groundImg = new Image();

    let loaded = 0;
    const onLoad = () => {
      loaded += 1;
      if (loaded === 3) {
        imagesRef.current = {
          dino: dinoImg,
          cactus: cactusImg,
          ground: groundImg,
        };
        stateRef.current.ready = true;
        loop();
      }
    };

    dinoImg.onload = onLoad;
    cactusImg.onload = onLoad;
    groundImg.onload = onLoad;

    dinoImg.src = "/sprites/dino.png";
    cactusImg.src = "/sprites/cactus.png";
    groundImg.src = "/sprites/ground.jpg";

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
      const s = stateRef.current;
      if (!s.running || !s.ready) return;

      // Física del dino
      s.dino.y += s.dino.vy;
      s.dino.vy += s.dino.gravity;
      // Limitar al suelo
      const groundY = s.groundTop - s.dino.height; // 210
      if (s.dino.y > groundY) {
        s.dino.y = groundY;
        s.dino.vy = 0;
      }

      // Mover fondo
      s.groundX -= s.speed;
      if (s.groundX <= -canvas.width) s.groundX = 0;

      // Mover obstáculos
      for (const obs of s.obstacles) {
        obs.x -= s.speed;
        if (obs.x + obs.width < 0) {
          // Reaparecer a la derecha con un hueco aleatorio
          obs.x = canvas.width + 200 + Math.random() * 300;
        }
      }

      // Colisiones (hitbox del cactus ligeramente más chico)
      for (const obs of s.obstacles) {
        const hitbox = {
          x: obs.x + 5,
          y: obs.y,
          width: obs.width - 10,
          height: obs.height,
        };
        if (collide(s.dino, hitbox)) {
          s.running = false;
          setRunningUI(false);
          break;
        }
      }

      // Aumentar score / dificultad leve
      s.score += 0.5;
      if (s.score % 300 === 0) s.speed = Math.min(s.speed + 0.5, 12);
    }

    function draw() {
      const s = stateRef.current;
      const imgs = imagesRef.current!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Suelo (dos dibujos para loop infinito)
      ctx.drawImage(
        imgs.ground,
        s.groundX,
        s.groundTop,
        canvas.width,
        canvas.height - s.groundTop
      );
      ctx.drawImage(
        imgs.ground,
        s.groundX + canvas.width,
        s.groundTop,
        canvas.width,
        canvas.height - s.groundTop
      );

      // Dino
      ctx.drawImage(imgs.dino, s.dino.x, s.dino.y, s.dino.width, s.dino.height);

      // Obstáculos
      for (const obs of s.obstacles) {
        const img = imgs.cactus; // único tipo por ahora
        ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
      }

      // UI mínima: score
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText(`Score: ${Math.floor(s.score)}`, canvas.width - 120, 24);

      if (!s.running) {
        // Overlay simple de Game Over
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText("Perdiste! Puntaje: " + Math.floor(s.score), 50, 80);
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
  }, []);

  return (
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
        // <button
        //   style={{ width: canvasRef.current?.width || 802 }}
        //   className={style.button}
        //   onClick={() => (stateRef.current.running ? jump() : null)}
        // >
        //   Saltar
        // </button>
        <button
          style={{ display: "none" }}
          onClick={() => {
            stateRef.current.running = false; /* ya está en false */
            stateRef.current.ready ? undefined : undefined;
            setRunningUI(
              false
            ); /* noop */ /* reinicio real */ /* preferimos restart() para limpiar todo */
          }}
        />
      )}
      {!runningUI && (
        <button
          style={{ display: "none" }}
          onClick={() => {
            /* reiniciar estado del juego */ const s = stateRef.current;
            s.running = false; /* asegurar */
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
              s.dino.x = 50;
              s.dino.y = s.groundTop - s.dino.height;
              s.dino.vy = 0;
              s.obstacles = [
                {
                  x: 600,
                  y: s.groundTop - 50,
                  width: 40,
                  height: 50,
                  type: "cactus",
                },
              ];
              s.score = 0;
            })();
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
