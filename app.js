const POSES = {
    feet1: {
        name: "Feet: 1st position",
        description: "The feet are turned out and the heels are together.",
        points: [
            "Keep the heels as close to each other as possible.",
            "Turn the feet as open as possible without forcing them.",
            "Keep the knees straight and relaxed, facing towards the sides.",
            "Stand evenly on both feet, with the weight distributed equally.",
        ]
    },
    feet2: {
        name: "Feet: 2nd position",
        description: "The feet are apart, with the heels aligned and the toes turned out.",
        points: [
            "The feet should be about shoulder-width apart, with the heels aligned and the toes turned out.",
            "Don't let your pelvis tilt forward or backward, keep it neutral.",
            "Keep the knees straight and relaxed, facing towards the sides.",
            "Stand evenly on both feet, with the weight distributed equally.",
        ]
    },
    feet3: {
        name: "Feet: 3rd position",
        description: "The other foot is slightly crossed in front of the other.",
        points: [
            "The front foot should be touching the middle of the back foot.",
            "Both feet should be evenly turned out, with the toes pointing away from each other.",
            "Keep the knees straight and relaxed, facing towards the sides.",
            "Stand evenly on both feet, with the weight distributed equally.",
        ]
    },
    feet4: {
        name: "Feet: 4th position",
        description: "The feet are a foot apart from each other, with the heels aligned and the toes turned out.",
        points: [
            "The feet should be about one foot apart.",
            "Both feet should be evenly turned out, with the toes pointing away from each other.",
            "The upper body should not twist.",
            "Keep the knees straight and relaxed, facing towards the sides.",
            "Stand evenly on both feet, with the weight distributed equally.",
        ]
    },
    feet5: {
        name: "Feet: 5th position",
        description: "The feet are crossed, with the heel of one foot touching the toe of the other.",
        points: [
            "The heel of the front foot should be touching the toe of the back foot.",
            "Both feet should be evenly turned out, with the toes pointing away from each other.",
            "Don't let your pelvis tilt forward or backward, keep it neutral.",
            "Keep the knees straight and relaxed, facing towards the sides.",
            "Stand evenly on both feet, with the weight distributed equally."
        ]
    },
    feet6: {
        name: "Feet: 6th position",
        description: "The feet are together, facing forward.",
        points: [
            "Keep the feet tightly together.",
            "The toes should be pointing straight ahead.",
            "Don't let your pelvis tilt forward or backward, keep it neutral.",
        ]
    },
    arms_basics: {
        name: "Arms: Bras bas",
        description: "The arms are rounded and held low.",
        points: [
            "The elbows should be slightly bent and facing to the sides.",
            "Chest up, shoulders down and relaxed.",
        ]
    },
    arms1: {
        name: "Arms: 1st position",
        description: "The arms are rounded and held in front of the body.",
        points: [
            "The elbows should be bent, slightly higher than the wrists and facing to the sides.",
            "The fingertips should be almost touching, with the palms facing each other.",
            "Chest up, shoulders down and relaxed."
        ]
    },
    arms2: {
        name: "Arms: 2nd position",
        description: "The arms are rounded and held to the sides of the body.",
        points: [
            "The elbows should be barely bent, slightly higher than the wrists.",
            "Palms should be facing forward, with the fingers slightly apart.",
            "Chest up, shoulders down and relaxed."
        ]
    },
    arms3: {
        name: "Arms: 3rd position",
        description: "The arms are rounded and held above the head.",
        points: [
            "The elbows should be bent, with the fingertips almost touching and the palms facing the face.",
            "Chest up, shoulders down and relaxed."
        ]
    }
};

// Foot recognition using MediaPipe landmarks
//  MediaPipe landmarks used:
//    23/24 = left/right hip
//    27/28 = left/right ankle
//    29/30 = left/right heel
//    31/32 = left/right foot index (big-toe side)

//  Position logic:
//    6th → toes straight forward (low turnout), feet together
//    1st → turned out, heels touching, no front/back separation
//    2nd → turned out, heels wide apart, no front/back separation
//    3rd → one foot in front, partial side overlap
//    4th → one foot in front, clear side gap
//    5th → one foot in front, feet tightly overlapping

function recognizeFeet(lm) {
    const lHeel  = lm[29], rHeel  = lm[30];
    const lToe   = lm[31], rToe   = lm[32];
    const lAnkle = lm[27], rAnkle = lm[28];
    const lHip   = lm[23], rHip   = lm[24];

    const hipWidth = Math.abs(lHip.x - rHip.x) || 0.25;

    // --- Turnout ---
    const lTurnout = Math.abs(lToe.x - lHeel.x) / (Math.abs(lToe.y - lHeel.y) + 0.001);
    const rTurnout = Math.abs(rToe.x - rHeel.x) / (Math.abs(rToe.y - rHeel.y) + 0.001);
    const avgTurnout = (lTurnout + rTurnout) / 2;
    const isParallel = avgTurnout < 0.5; // tightened: only clearly forward-facing feet

    // --- Heel separation (side-to-side) ---
    const heelXRel = Math.abs(lHeel.x - rHeel.x) / hipWidth;
    const heelsTouching = heelXRel < 0.5;
    const heelsWide     = heelXRel > 0.55; // lowered: 2nd position heels are ~shoulder width

    // --- Front/back separation ---
    const ankleYDiff  = lAnkle.y - rAnkle.y;
    const ankleYRel   = Math.abs(ankleYDiff) / hipWidth;
    const footInFront = ankleYRel > 0.20; // raised significantly: ignore small wobbles

    // --- Which foot is front/back ---
    const frontAnkle = ankleYDiff > 0 ? lAnkle : rAnkle;
    const backToe    = ankleYDiff > 0 ? rToe   : lToe;

    // --- 3rd vs 5th: back toe visibility ---
    // Compare back toe X to front ankle X, normalized to hip width
    const toeXDiff = Math.abs(backToe.x - frontAnkle.x) / hipWidth;

    // --- 4th: clearly separated front/back ---
    const isWideYGap = ankleYRel > 0.4; // raised: 4th needs obvious front/back step

    // ── DETECTION (most specific first) ────────────────────────

    // 6th: parallel + together
    if (isParallel && heelsTouching) return "feet6";

    // 1st: turned out + heels touching + side by side
    if (!footInFront && heelsTouching && !isParallel) return "feet1";

    // 2nd: turned out + heels wide + side by side
    if (!footInFront && heelsWide) return "feet2";

    // Crossed positions
    if (footInFront) {
        // 5th: tiukka risti, turnout, varpaat piilossa
        if (toeXDiff < 0.08 && ankleYRel > 0.05 && ankleYRel < 0.25 && !isParallel && !heelsTouching) {
            return "feet5";
        }

        // 3rd: pieni risti, varpaat näkyvät
        if (toeXDiff >= 0.12 && ankleYRel >= 0.20 && ankleYRel < 0.35) {
            return "feet3";
        }

        // 4th: iso askel
        if (ankleYRel >= 0.35) {
            return "feet4";
        }
    }

    // In-between (not wide, not touching, not clearly stepped) → most likely 2nd
    if (!isParallel) return "feet2";

    return "feet1";
}

// Arm recognition using MediaPipe landmarks
//  MediaPipe landmarks used:
//    11/12 = left/right shoulder
//    15/16 = left/right wrist
//    23/24 = left/right hip

function recognizeArms(lm) {
    const lWrist    = lm[15], rWrist    = lm[16];
    const lShoulder = lm[11], rShoulder = lm[12];
    const lHip      = lm[23], rHip      = lm[24];
 
    const hipY          = (lHip.y + rHip.y) / 2;
    const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
 
    const lUp    = lWrist.y < lShoulder.y - 0.08;
    const rUp    = rWrist.y < rShoulder.y - 0.08;
    const lSide  = Math.abs(lWrist.x - lShoulder.x) > shoulderWidth * 0.7;
    const rSide  = Math.abs(rWrist.x - rShoulder.x) > shoulderWidth * 0.7;
    const lDown  = lWrist.y > hipY - 0.05;
    const rDown  = rWrist.y > hipY - 0.05;
    const lFront = !lUp && !lSide && !lDown;
    const rFront = !rUp && !rSide && !rDown;
 
    if (lUp || rUp)       return "arms3";
    if (lSide && rSide)   return "arms2";
    if (lFront && rFront) return "arms1";
    return "arms_basics";
}

// Recognize overall pose based on feet and arms
function recognizePose(lm) {
    if (!lm || lm.length < 33) return null;
    return {
        feet: recognizeFeet(lm),
        arms: recognizeArms(lm)
    };
}

// DOM elements
const video           = document.getElementById("video");
const poseCanvas      = document.getElementById("pose-canvas");
const ctx             = poseCanvas.getContext("2d");
const startBtn        = document.getElementById("start-btn");  // FIX: was "start-button" but HTML has "start-btn"
const restartBtn      = document.getElementById("restart-btn");
const cameraView      = document.getElementById("camera-view");
const resultView      = document.getElementById("result-view");
const capturedPhoto   = document.getElementById("captured-photo");
const loadingElement  = document.getElementById("loading");
const resultText      = document.getElementById("result-text");
const countdownEl     = document.getElementById("countdown-display"); // FIX: was "countdownElement" but used as "countdownEl" below
const countdownNum    = document.getElementById("countdown-number");

let lastLandmarks = null;
let isCounting    = false;
let poseDetected  = false;

// Start the application
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 1280, height: 720 }
        });
        video.srcObject = stream;
        await new Promise(r => { video.onloadedmetadata = r; });
        poseCanvas.width  = video.videoWidth;
        poseCanvas.height = video.videoHeight;
        setupMediaPipe();
    } catch (err) {
        console.error('Camera not working:', err);
        alert('Camera not working. Please check browser permissions.');
    }
}

// MediaPipe setup
function setupMediaPipe() {
    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
        ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
        if (results.poseLandmarks) {
            lastLandmarks = results.poseLandmarks;
            poseDetected = true;
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,
                { color: 'rgba(200, 140, 255, 0.75)', lineWidth: 3 });
            drawLandmarks(ctx, results.poseLandmarks,
                { color: 'rgba(255, 210, 255, 1)', lineWidth: 2, radius: 4 });
        } else {
            poseDetected = false;
        }
    });

    const camera = new Camera(video, {
        onFrame: async () => { await pose.send({ image: video }); },
        width: 1280,
        height: 720
    });
    camera.start();
}

// Countdown
startBtn.addEventListener('click', () => {
    if (isCounting) return;
    isCounting = true;
    startBtn.style.display = 'none';
    countdownEl.classList.remove('hidden');

    let count = 8;
    countdownNum.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(interval);
            countdownEl.classList.add('hidden');
            isCounting = false;
            captureAndAnalyze();
        } else {
            countdownNum.textContent = count;
        }
    }, 1000);
});

// Restart
restartBtn.addEventListener('click', () => {
    resultView.classList.add('hidden');
    cameraView.classList.remove('hidden');
    startBtn.style.display = '';
    resultText.classList.add('hidden');
    loadingElement.classList.remove('hidden');
});

// Capture and analyze
function captureAndAnalyze() {
    const snap = document.createElement('canvas');
    snap.width  = video.videoWidth;
    snap.height = video.videoHeight;
    const snapCtx = snap.getContext('2d');
    snapCtx.save();
    snapCtx.scale(-1, 1);
    snapCtx.drawImage(video, -snap.width, 0);
    snapCtx.restore();
    const dataUrl = snap.toDataURL('image/jpeg', 0.92);

    const result = recognizePose(lastLandmarks);

    capturedPhoto.src = dataUrl;
    cameraView.classList.add('hidden');
    resultView.classList.remove('hidden');

    setTimeout(() => {
        showResult(result);
    }, 800);
}

// Show result
function showResult(result) {
    loadingElement.classList.add('hidden');
    resultText.classList.remove('hidden');

    if (!result) {
        resultText.innerHTML = `
            <h2>Pose not recognized</h2>
            <p>Make sure the whole body is visible in the frame.</p>
        `;
        return;
    }

    const feet = POSES[result.feet];
    const arms = POSES[result.arms];

    resultText.innerHTML = `
        <h2>Pose recognized!</h2>
        <div class="pose-result">${feet.name}</div>
        <p class="pose-description">${feet.description}</p>

        <div class="arms-info">
            Arms: <strong>${arms.name}</strong>
            <span class="arms-description"> – ${arms.description}</span>
        </div>

        <div class="tips-header">Tips for feet:</div>
        <ul class="tips">
            ${feet.points.map(p => `<li>${p}</li>`).join('')}
        </ul>

        <div class="tips-header">Tips for arms:</div>
        <ul class="tips">
            ${arms.points.slice(0, 2).map(p => `<li>${p}</li>`).join('')}
        </ul>
    `;
}

init();