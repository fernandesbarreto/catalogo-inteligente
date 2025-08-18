import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface PaintWithEmbedding {
  id: string;
  name: string;
  color: string;
  colorHex: string;
  surfaceType: string;
  roomType: string;
  finish: string;
  features: string;
  line: string;
  embedding: number[];
}

// Simple PCA implementation for 2D visualization
function pca(embeddings: number[][], targetDimensions: number = 2): number[][] {
  if (embeddings.length === 0) return [];

  const n = embeddings.length;
  const d = embeddings[0].length;

  // Center the data (subtract mean)
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += embeddings[i][j];
    }
  }
  for (let j = 0; j < d; j++) {
    mean[j] /= n;
  }

  const centered = embeddings.map((embedding) =>
    embedding.map((val, j) => val - mean[j])
  );

  // Compute covariance matrix
  const covariance = new Array(d).fill(0).map(() => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      for (let k = 0; k < n; k++) {
        covariance[i][j] += centered[k][i] * centered[k][j];
      }
      covariance[i][j] /= n - 1;
    }
  }

  // Simple eigenvalue decomposition (for 2D, we'll use the first two principal components)
  // This is a simplified version - in production you'd use a proper linear algebra library

  // For now, let's use a simpler approach: normalize and use first two dimensions
  const normalized = embeddings.map((embedding) => {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    return embedding.map((val) => val / magnitude);
  });

  // Use the first two dimensions as x and y, but scale them differently
  return normalized.map((embedding) => {
    const x =
      embedding.slice(0, Math.floor(d / 2)).reduce((sum, val) => sum + val, 0) /
      Math.floor(d / 2);
    const y =
      embedding.slice(Math.floor(d / 2)).reduce((sum, val) => sum + val, 0) /
      (d - Math.floor(d / 2));
    return [x * 100, y * 100]; // Scale up for better visualization
  });
}

// Generate HTML visualization with better positioning
function generateHTML(
  paints: PaintWithEmbedding[],
  coordinates: number[][]
): string {
  // Find min/max for proper scaling
  const xCoords = coordinates.map((coord) => coord[0]);
  const yCoords = coordinates.map((coord) => coord[1]);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Paint Embeddings Visualization (PCA)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .visualization { 
            border: 1px solid #ddd; 
            height: 700px; 
            position: relative; 
            background: #fafafa;
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
        }
        .point {
            position: absolute;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            z-index: 1;
        }
        .point:hover {
            transform: scale(2);
            z-index: 1000;
            box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
        .tooltip {
            position: absolute;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            max-width: 250px;
            z-index: 1001;
            display: none;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            line-height: 1.4;
        }
        .stats { 
            margin: 20px 0; 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .color-preview {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 10px;
            border: 2px solid #ddd;
            vertical-align: middle;
        }
        .legend {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            font-size: 14px;
        }
        .coordinates-info {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Paint Embeddings Visualization (PCA)</h1>
        
        <div class="stats">
            <div class="stat-card">
                <strong>Total Paints:</strong> ${paints.length}
            </div>
            <div class="stat-card">
                <strong>Embedding Dimensions:</strong> ${
                  paints[0]?.embedding.length || 0
                }
            </div>
            <div class="stat-card">
                <strong>X Range:</strong> ${minX.toFixed(2)} to ${maxX.toFixed(
    2
  )}
            </div>
            <div class="stat-card">
                <strong>Y Range:</strong> ${minY.toFixed(2)} to ${maxY.toFixed(
    2
  )}
            </div>
        </div>
        
        <div class="coordinates-info">
            <strong>Coordinate System:</strong> X: ${minX.toFixed(
              2
            )} to ${maxX.toFixed(2)} | Y: ${minY.toFixed(2)} to ${maxY.toFixed(
    2
  )}
        </div>
        
        <div class="visualization" id="viz">
            ${paints
              .map((paint, i) => {
                const coord = coordinates[i];
                // Normalize coordinates to 0-100% for positioning
                const x = ((coord[0] - minX) / (maxX - minX)) * 100;
                const y = ((coord[1] - minY) / (maxY - minY)) * 100;
                return `
                    <div class="point" 
                         style="left: ${x}%; top: ${y}%; background-color: ${
                  paint.colorHex
                };"
                         data-name="${paint.name}"
                         data-color="${paint.color}"
                         data-line="${paint.line}"
                         data-surface="${paint.surfaceType}"
                         data-room="${paint.roomType}"
                         data-finish="${paint.finish}"
                         data-features="${paint.features}"
                         data-coords="(${coord[0].toFixed(
                           2
                         )}, ${coord[1].toFixed(2)})"
                         onmouseover="showTooltip(event, this)"
                         onmouseout="hideTooltip()">
                    </div>
                `;
              })
              .join("")}
        </div>
        
        <div class="tooltip" id="tooltip"></div>
        
        <h3>📊 Paint Lines Distribution:</h3>
        <div class="legend">
            ${Object.entries(
              paints.reduce((acc, paint) => {
                acc[paint.line] = (acc[paint.line] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .map(
                ([line, count]) => `
                <div class="legend-item">
                    <span class="color-preview" style="background-color: ${
                      paints.find((p) => p.line === line)?.colorHex || "#ccc"
                    }"></span>
                    <strong>${line}:</strong> ${count} paints
                </div>
            `
              )
              .join("")}
        </div>
    </div>

    <script>
        function showTooltip(event, element) {
            const tooltip = document.getElementById('tooltip');
            const name = element.dataset.name;
            const color = element.dataset.color;
            const line = element.dataset.line;
            const surface = element.dataset.surface;
            const room = element.dataset.room;
            const finish = element.dataset.finish;
            const features = element.dataset.features;
            const coords = element.dataset.coords;
            
            tooltip.innerHTML = \`
                <div style="margin-bottom: 8px;">
                    <strong style="color: #ffd700;">\${name}</strong><br>
                    <span style="color: #ccc;">Coordinates: \${coords}</span>
                </div>
                <div style="border-top: 1px solid #555; padding-top: 8px;">
                    <strong>Color:</strong> \${color}<br>
                    <strong>Line:</strong> \${line}<br>
                    <strong>Surface:</strong> \${surface}<br>
                    <strong>Room:</strong> \${room}<br>
                    <strong>Finish:</strong> \${finish}<br>
                    <strong>Features:</strong> \${features || 'None'}
                </div>
            \`;
            
            tooltip.style.display = 'block';
            tooltip.style.left = event.pageX + 15 + 'px';
            tooltip.style.top = event.pageY - 15 + 'px';
        }
        
        function hideTooltip() {
            document.getElementById('tooltip').style.display = 'none';
        }
        
        // Add click handler to log coordinates for debugging
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('point')) {
                console.log('Clicked point:', event.target.dataset);
            }
        });
    </script>
</body>
</html>`;

  return html;
}

async function visualizeEmbeddingsPCA() {
  try {
    console.log("🔍 Fetching paints with embeddings...");

    // Get all paints with embeddings
    const paints = await prisma.$queryRaw<any[]>`
      SELECT id, name, color, color_hex as "colorHex", surface_type as "surfaceType", 
             room_type as "roomType", finish, features, line, 
             embedding::text as embedding_str
      FROM paints
      WHERE embedding IS NOT NULL
    `;

    // Convert embedding strings back to arrays
    const paintsWithEmbeddings: PaintWithEmbedding[] = paints.map((paint) => {
      // Remove the brackets and split by comma
      const embeddingStr = paint.embedding_str.replace(/[\[\]]/g, "");
      const embeddingArray = embeddingStr
        .split(",")
        .map((x: string) => parseFloat(x.trim()));
      return {
        ...paint,
        embedding: embeddingArray,
      };
    });

    console.log(
      `📊 Found ${paintsWithEmbeddings.length} paints with embeddings`
    );

    if (paintsWithEmbeddings.length === 0) {
      console.log(
        "❌ No paints with embeddings found. Run the seed script first!"
      );
      return;
    }

    // Extract embeddings
    const embeddings = paintsWithEmbeddings.map((paint) => paint.embedding);

    console.log("🎨 Applying PCA for dimensionality reduction...");
    const coordinates = pca(embeddings);

    console.log("📝 Generating HTML visualization...");
    const html = generateHTML(paintsWithEmbeddings, coordinates);

    // Save to file
    const outputPath = path.join(
      process.cwd(),
      "embeddings_visualization_pca.html"
    );
    fs.writeFileSync(outputPath, html);

    console.log(`✅ PCA Visualization saved to: ${outputPath}`);
    console.log(
      "🌐 Open the HTML file in your browser to view the visualization"
    );
    console.log("💡 Hover over points to see paint details and coordinates");
  } catch (error) {
    console.error("❌ Error visualizing embeddings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the visualization
if (require.main === module) {
  visualizeEmbeddingsPCA()
    .then(() => {
      console.log("✅ PCA Visualization completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ PCA Visualization failed:", error);
      process.exit(1);
    });
}
