/**
 * High-performance browser-side STL Parser & Geometry Calculator
 * Supports both Binary and ASCII STL files, plus Procedural 3D Mesh Generation for Web Models.
 */
class STLParser {
  static parse(buffer) {
    if (!buffer || buffer.byteLength < 5) return null;
    const isBinary = this.isBinary(buffer);
    return isBinary ? this.parseBinary(buffer) : this.parseASCII(new TextDecoder().decode(buffer));
  }

  static isBinary(buffer) {
    const reader = new DataView(buffer);
    if (buffer.byteLength < 84) return false;
    const faceCount = reader.getUint32(80, true);
    const expectedByteLength = 84 + faceCount * 50;
    return buffer.byteLength === expectedByteLength || buffer.byteLength >= expectedByteLength;
  }

  static parseBinary(buffer) {
    const reader = new DataView(buffer);
    const faceCount = reader.getUint32(80, true);
    
    const positions = new Float32Array(faceCount * 9);
    const normals = new Float32Array(faceCount * 9);

    let offset = 84;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalVolume = 0;
    let totalArea = 0;

    for (let i = 0; i < faceCount; i++) {
      if (offset + 50 > buffer.byteLength) break;

      const nx = reader.getFloat32(offset, true);
      const ny = reader.getFloat32(offset + 4, true);
      const nz = reader.getFloat32(offset + 8, true);
      offset += 12;

      const v1x = reader.getFloat32(offset, true);
      const v1y = reader.getFloat32(offset + 4, true);
      const v1z = reader.getFloat32(offset + 8, true);
      offset += 12;

      const v2x = reader.getFloat32(offset, true);
      const v2y = reader.getFloat32(offset + 4, true);
      const v2z = reader.getFloat32(offset + 8, true);
      offset += 12;

      const v3x = reader.getFloat32(offset, true);
      const v3y = reader.getFloat32(offset + 4, true);
      const v3z = reader.getFloat32(offset + 8, true);
      offset += 12;

      offset += 2;

      const pIdx = i * 9;
      positions[pIdx] = v1x; positions[pIdx + 1] = v1y; positions[pIdx + 2] = v1z;
      positions[pIdx + 3] = v2x; positions[pIdx + 4] = v2y; positions[pIdx + 5] = v2z;
      positions[pIdx + 6] = v3x; positions[pIdx + 7] = v3y; positions[pIdx + 8] = v3z;

      normals[pIdx] = nx; normals[pIdx + 1] = ny; normals[pIdx + 2] = nz;
      normals[pIdx + 3] = nx; normals[pIdx + 4] = ny; normals[pIdx + 5] = nz;
      normals[pIdx + 6] = nx; normals[pIdx + 7] = ny; normals[pIdx + 8] = nz;

      minX = Math.min(minX, v1x, v2x, v3x);
      maxX = Math.max(maxX, v1x, v2x, v3x);
      minY = Math.min(minY, v1y, v2y, v3y);
      maxY = Math.max(maxY, v1y, v2y, v3y);
      minZ = Math.min(minZ, v1z, v2z, v3z);
      maxZ = Math.max(maxZ, v1z, v2z, v3z);

      const v321 = v3x * v2y * v1z;
      const v231 = v2x * v3y * v1z;
      const v312 = v3x * v1y * v2z;
      const v132 = v1x * v3y * v2z;
      const v213 = v2x * v1y * v3z;
      const v123 = v1x * v2y * v3z;
      totalVolume += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0;

      const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
      const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }

    const volumeCm3 = Math.abs(totalVolume) / 1000.0;
    const areaCm2 = totalArea / 100.0;

    return {
      faceCount,
      positions,
      normals,
      dimensions: {
        x: Math.abs(maxX - minX),
        y: Math.abs(maxY - minY),
        z: Math.abs(maxZ - minZ)
      },
      boundingBox: { minX, maxX, minY, maxY, minZ, maxZ },
      volumeCm3,
      areaCm2
    };
  }

  static parseASCII(text) {
    const patternVertex = /vertex\s+([-\d\.eE+]+)\s+([-\d\.eE+]+)\s+([-\d\.eE+]+)/g;
    const vertices = [];
    let match;

    while ((match = patternVertex.exec(text)) !== null) {
      vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    }

    const faceCount = Math.floor(vertices.length / 9);
    const positions = new Float32Array(vertices);
    const normals = new Float32Array(positions.length);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalVolume = 0;
    let totalArea = 0;

    for (let i = 0; i < faceCount; i++) {
      const pIdx = i * 9;
      const v1x = positions[pIdx], v1y = positions[pIdx + 1], v1z = positions[pIdx + 2];
      const v2x = positions[pIdx + 3], v2y = positions[pIdx + 4], v2z = positions[pIdx + 5];
      const v3x = positions[pIdx + 6], v3y = positions[pIdx + 7], v3z = positions[pIdx + 8];

      minX = Math.min(minX, v1x, v2x, v3x);
      maxX = Math.max(maxX, v1x, v2x, v3x);
      minY = Math.min(minY, v1y, v2y, v3y);
      maxY = Math.max(maxY, v1y, v2y, v3y);
      minZ = Math.min(minZ, v1z, v2z, v3z);
      maxZ = Math.max(maxZ, v1z, v2z, v3z);

      const v321 = v3x * v2y * v1z;
      const v231 = v2x * v3y * v1z;
      const v312 = v3x * v1y * v2z;
      const v132 = v1x * v3y * v2z;
      const v213 = v2x * v1y * v3z;
      const v123 = v1x * v2y * v3z;
      totalVolume += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0;

      const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
      const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }

    return {
      faceCount,
      positions,
      normals,
      dimensions: {
        x: Math.abs(maxX - minX),
        y: Math.abs(maxY - minY),
        z: Math.abs(maxZ - minZ)
      },
      boundingBox: { minX, maxX, minY, maxY, minZ, maxZ },
      volumeCm3: Math.abs(totalVolume) / 1000.0,
      areaCm2: totalArea / 100.0
    };
  }

  /**
   * Generates a 3D Stylized Cylinder/Container Geometry Mesh matching volume and dimensions for web models
   */
  static createProceduralMesh(volumeCm3 = 40, dimensions = { x: 60, y: 60, z: 40 }) {
    const dx = dimensions.x || 60;
    const dy = dimensions.y || 60;
    const dz = dimensions.z || 40;

    const radius = Math.min(dx, dy) / 2.0;
    const height = dz;
    const segments = 18;

    const verts = [];
    const normals = [];

    // Helper to push triangle
    const addTri = (v1, v2, v3) => {
      verts.push(...v1, ...v2, ...v3);
      // Compute normal
      const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
      const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      const norm = [nx/len, ny/len, nz/len];
      normals.push(...norm, ...norm, ...norm);
    };

    const halfH = height / 2.0;
    const topRadius = radius * 0.9;
    const botRadius = radius;

    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;

      const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
      const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);

      const b1 = [botRadius * cos1, -halfH, botRadius * sin1];
      const b2 = [botRadius * cos2, -halfH, botRadius * sin2];
      const t1 = [topRadius * cos1, halfH, topRadius * sin1];
      const t2 = [topRadius * cos2, halfH, topRadius * sin2];

      // Side Wall 2 Triangles
      addTri(b1, b2, t2);
      addTri(b1, t2, t1);

      // Top Cap Triangle
      addTri([0, halfH, 0], t1, t2);

      // Bottom Cap Triangle
      addTri([0, -halfH, 0], b2, b1);
    }

    const positions = new Float32Array(verts);
    const normalsArray = new Float32Array(normals);
    const calculatedVol = (Math.PI * radius * radius * height) / 1000.0;

    return {
      faceCount: segments * 4,
      positions,
      normals: normalsArray,
      dimensions: { x: dx, y: dy, z: dz },
      volumeCm3: volumeCm3 || calculatedVol,
      areaCm2: (2 * Math.PI * radius * height + 2 * Math.PI * radius * radius) / 100.0,
      isProcedural: true
    };
  }
}

if (typeof module !== 'undefined') {
  module.exports = STLParser;
}
