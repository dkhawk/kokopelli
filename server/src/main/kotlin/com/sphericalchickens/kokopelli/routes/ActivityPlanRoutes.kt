package com.sphericalchickens.kokopelli.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.HttpStatusCode
import com.sphericalchickens.kokopelli.models.ActivityPlan
import com.sphericalchickens.kokopelli.database.ActivityPlansTable
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

fun Route.activityPlanRoutes() {
    route("/api/v1/activity-plans") {
        post {
            val plan = call.receive<ActivityPlan>()
            val planId = plan.id.ifEmpty { UUID.randomUUID().toString() }
            transaction {
                ActivityPlansTable.insert {
                    it[id] = planId
                    it[athleteProfileId] = plan.athleteProfileId
                    it[courseId] = plan.courseId
                    it[spiritAnimalId] = plan.spiritAnimalId
                    it[scheduledStartTime] = plan.scheduledStartTime
                    it[fitnessCalibrationModifier] = plan.fitnessCalibrationModifier
                    it[uniqueShareToken] = plan.uniqueShareToken
                    it[morningPrepJson] = plan.morningPrepJson
                    it[status] = plan.status.name
                }
            }
            call.respond(HttpStatusCode.Created, plan.copy(id = planId))
        }
    }
}
