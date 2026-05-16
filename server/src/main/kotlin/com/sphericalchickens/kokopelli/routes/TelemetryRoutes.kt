package com.sphericalchickens.kokopelli.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.HttpStatusCode
import com.sphericalchickens.kokopelli.models.TelemetrySnapshot
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction

object TelemetrySnapshotsTable : Table("telemetry_snapshots") {
    val id = long("id").autoIncrement()
    val activitySessionId = varchar("activity_session_id", 36)
    val timestamp = long("timestamp")
    val latitude = double("latitude")
    val longitude = double("longitude")
    val currentElevationMeters = float("current_elevation_meters")
    val cumulativeDistanceMeters = float("cumulative_distance_meters")
    val currentHeartRate = integer("current_heart_rate")
    val estimatedFinishTime = long("estimated_finish_time")

    override val primaryKey = PrimaryKey(id)
}

fun Route.telemetryRoutes() {
    route("/api/v1/telemetry") {
        post {
            val telemetry = call.receive<TelemetrySnapshot>()
            var newId: Long = 0
            transaction {
                newId = TelemetrySnapshotsTable.insert {
                    it[activitySessionId] = telemetry.activitySessionId
                    it[timestamp] = telemetry.timestamp
                    it[latitude] = telemetry.latitude
                    it[longitude] = telemetry.longitude
                    it[currentElevationMeters] = telemetry.currentElevationMeters
                    it[cumulativeDistanceMeters] = telemetry.cumulativeDistanceMeters
                    it[currentHeartRate] = telemetry.currentHeartRate
                    it[estimatedFinishTime] = telemetry.estimatedFinishTime
                } get TelemetrySnapshotsTable.id
            }
            call.respond(HttpStatusCode.Created, telemetry.copy(id = newId))
        }
    }
}
