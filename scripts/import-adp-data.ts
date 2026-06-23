/* eslint-env node */
import { prisma } from "../lib/prisma"
import * as fs from "fs"
import * as path from "path"

/**
 * This script imports ADP data from the nfl-adp-multiplatform.csv file.
 * Skips duplicates and players without ADP data.
 */
async function importAdpData() {
  console.log("Starting ADP data import...")

  try {
    // Path to your existing CSV file
    const csvPath = path.join(process.cwd(), "data", "nfl-adp-multiplatform.csv")
    
    if (!fs.existsSync(csvPath)) {
      console.log(`CSV file not found at: ${csvPath}`)
      process.exit(1)
    }

    console.log(`Reading CSV file: ${csvPath}`)
    const fileContent = fs.readFileSync(csvPath, "utf-8")
    
    // Parse CSV properly
    const lines = fileContent.split("\n").filter((line: string) => line.trim())
    
    // Get headers
    const headerLine = lines[0]
    const headers = headerLine.split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""))
    
    console.log(`Headers: ${headers.join(", ")}`)
    console.log(`Found ${lines.length - 1} data rows`)

    // Column indices based on the CSV structure
    const nameIndex = 1   // Name column
    const teamIndex = 2   // Team column
    const posIndex = 3    // Pos column
    const adpIndex = 4    // Fantrax ADP (first ADP column)

    console.log(`Name column: ${headers[nameIndex]} (index ${nameIndex})`)
    console.log(`Team column: ${headers[teamIndex]} (index ${teamIndex})`)
    console.log(`Position column: ${headers[posIndex]} (index ${posIndex})`)
    console.log(`ADP column: ${headers[adpIndex]} (index ${adpIndex})`)

    let successCount = 0
    let failCount = 0
    let skippedCount = 0
    let duplicateCount = 0
    let noAdpCount = 0

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i]
        if (!line.trim()) continue
        
        // Split by comma
        const values = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""))
        
        const playerName = values[nameIndex] || ""
        const team = values[teamIndex] || ""
        const position = values[posIndex] || ""
        const adpValue = values[adpIndex] ? parseFloat(values[adpIndex]) : null

        // Skip if missing required fields
        if (!playerName || !position) {
          skippedCount++
          continue
        }

        // Skip if ADP is null or 0 or invalid
        if (adpValue === null || isNaN(adpValue) || adpValue === 0 || adpValue > 500) {
          noAdpCount++
          continue
        }

        // Skip defensive players (they don't have ADP data usually)
        const defensivePositions = ["CB", "S", "SS", "FS", "DB", "LB", "DL", "DT", "DE", "NT", "EDGE", "ILB", "OLB", "MLB", "IDP"]
        if (defensivePositions.includes(position.toUpperCase())) {
          noAdpCount++
          continue
        }

        // Find the player in sportsPlayer by name
        let sportsPlayer = await prisma.sportsPlayer.findFirst({
          where: {
            name: {
              contains: playerName,
              mode: 'insensitive',
            },
            sport: "NFL",
          },
          select: { id: true },
        })

        if (!sportsPlayer) {
          skippedCount++
          continue
        }

        // Insert ADP data with ON CONFLICT DO NOTHING to skip duplicates
        const result = await prisma.$executeRaw`
          INSERT INTO adp_data (
            id, sport, format, scoring, player_id, player_name, position, team, adp, week, season, source
          ) VALUES (
            gen_random_uuid(), 'NFL', 'standard', 'ppr', ${sportsPlayer.id}, ${playerName}, ${position}, ${team || 'FA'}, 
            ${adpValue}, 1, 2025, 'csv_import'
          )
          ON CONFLICT (sport, format, scoring, player_id, week, season, source) DO NOTHING
        `

        if (result === 1n) {
          successCount++
          if (successCount % 50 === 0) {
            console.log(`Processed ${successCount} players...`)
          }
        } else {
          duplicateCount++
        }
      } catch (error) {
        failCount++
        if (failCount <= 5) {
          console.error(`Error on row ${i}:`, error)
        }
      }
    }

    console.log(`Import complete!`)
    console.log(`Success: ${successCount}`)
    console.log(`Failed: ${failCount}`)
    console.log(`Skipped (missing data): ${skippedCount}`)
    console.log(`Skipped (no ADP or defensive): ${noAdpCount}`)
    console.log(`Duplicates (already existed): ${duplicateCount}`)
  } catch (error) {
    console.error("Fatal error:", error)
    process.exit(1)
  }
}

importAdpData()
  .then(() => {
    console.log("Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })