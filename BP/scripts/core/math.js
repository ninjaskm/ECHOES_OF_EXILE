export function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function horizontalDistance(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}
export function normalizeVector(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length <= 0.0001)
        return { x: 0, y: 0, z: 0 };
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}
export function applyKnockbackSafe(entity, directionX, directionZ, horizontalStrength, verticalStrength) {
    try {
        entity.applyKnockback({ x: directionX * horizontalStrength, z: directionZ * horizontalStrength }, verticalStrength);
    }
    catch {
        entity.applyKnockback(directionX, directionZ, horizontalStrength, verticalStrength);
    }
}
