document.addEventListener("DOMContentLoaded", () => {
    let audioCtx = null;
    let activeOsc = null;
    let activeGain = null;
    let animationFrameId = null;
    let currentMode = null; // 'standard' or 'inverter'

    const btnStandard = document.getElementById("play-standard");
    const btnInverter = document.getElementById("play-inverter");
    const canvas = document.getElementById("soundwave-canvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    if (!btnStandard || !btnInverter || !canvas) return;

    // Resize canvas
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 100;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
    }

    function stopActiveSound() {
        if (activeOsc) {
            try {
                activeOsc.stop();
            } catch (e) {}
            activeOsc = null;
        }
        activeGain = null;
        currentMode = null;
        btnStandard.textContent = "🔊 Play Standard Noise (74 dB)";
        btnInverter.textContent = "🔊 Play Inverter Noise (55 dB)";
        btnStandard.classList.remove("active");
        btnInverter.classList.remove("active");
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawFlatLine();
        }
    }

    function drawFlatLine() {
        if (!ctx) return;
        ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
    drawFlatLine();

    function playSound(mode) {
        initAudio();
        stopActiveSound();

        currentMode = mode;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (mode === "standard") {
            // Standard: Loud, harsh low-frequency hum (sawtooth or triangle at 100Hz + harmonics)
            osc.type = "triangle";
            osc.frequency.setValueAtTime(95, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.24, audioCtx.currentTime);
            btnStandard.textContent = "⏹️ Mute Standard Unit";
            btnStandard.classList.add("active");
        } else {
            // Inverter: Quiet, smooth sine wave at 60Hz
            osc.type = "sine";
            osc.frequency.setValueAtTime(65, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            btnInverter.textContent = "⏹️ Mute Inverter Unit";
            btnInverter.classList.add("active");
        }

        activeOsc = osc;
        activeGain = gain;
        osc.start();

        // Start waveform animation
        animateWave();
    }

    let phase = 0;
    function animateWave() {
        if (!ctx || !currentMode) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const amp = currentMode === "standard" ? 35 : 10;
        const freq = currentMode === "standard" ? 0.05 : 0.02;
        const speed = currentMode === "standard" ? 0.25 : 0.08;

        ctx.strokeStyle = currentMode === "standard" ? "#EF4444" : "#10B981";
        ctx.lineWidth = currentMode === "standard" ? 3 : 1.8;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * freq + phase) * amp * (Math.sin(x * 0.005) * 0.8 + 0.2);
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        phase += speed;
        animationFrameId = requestAnimationFrame(animateWave);
    }

    btnStandard.addEventListener("click", () => {
        if (currentMode === "standard") {
            stopActiveSound();
        } else {
            playSound("standard");
        }
    });

    btnInverter.addEventListener("click", () => {
        if (currentMode === "inverter") {
            stopActiveSound();
        } else {
            playSound("inverter");
        }
    });
});
