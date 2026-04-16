package com.dedal.app;

/**
 * Utility class for game-related calculations on Android side.
 */
public class GameMath {
    
    public static double distance(double x1, double y1, double x2, double y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    public static boolean isPointInCircle(double px, double py, double cx, double cy, double radius) {
        return distance(px, py, cx, cy) <= radius;
    }
    
    public static String getSideOpponent(String side) {
        if (side == null) return null;
        String s = side.trim();
        if (s.equalsIgnoreCase("white")) return "black";
        if (s.equalsIgnoreCase("black")) return "white";
        return null;
    }
    
    public static int clamp(int val, int min, int max) {
        return Math.max(min, Math.min(max, val));
    }
    
    public static double lerp(double a, double b, double t) {
        return a + t * (b - a);
    }
    
    public static boolean isHexColor(String color) {
        if (color == null) return false;
        return color.matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");
    }

    public static double calculateRatingChange(double myRating, double opponentRating, double result) {
        // Simple Elo-like placeholder for testing
        double k = 32.0;
        double expected = 1.0 / (1.0 + Math.pow(10, (opponentRating - myRating) / 400.0));
        return k * (result - expected);
    }
}
