package com.serenegiant.utils;

/**
 * Minimal FpsCounter implementation to satisfy UVCCamera dependency.
 * This provides basic reset/update/getFps/getTotalFps methods used by UVCCameraTextureView.
 * It's intentionally simple and thread-safe for our use case.
 */
public class FpsCounter {
    private long lastTimeNs;
    private float fps;

    public FpsCounter() {
        reset();
    }

    public synchronized void reset() {
        lastTimeNs = System.nanoTime();
        fps = 0f;
    }

    /**
     * Called each frame to update the instantaneous fps estimate.
     */
    public synchronized void update() {
        long now = System.nanoTime();
        long diff = now - lastTimeNs;
        if (diff > 0) {
            // simple instantaneous FPS estimate
            fps = (float) (1_000_000_000.0 / (double) diff);
        }
        lastTimeNs = now;
    }

    public synchronized float getFps() {
        return fps;
    }

    /**
     * Keep compatibility: return the same instantaneous fps as total fps.
     */
    public synchronized float getTotalFps() {
        return fps;
    }
}
