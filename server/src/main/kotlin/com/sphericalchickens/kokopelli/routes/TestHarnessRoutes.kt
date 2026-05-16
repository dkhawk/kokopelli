package com.sphericalchickens.kokopelli.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.HttpStatusCode
import org.jetbrains.exposed.sql.transactions.transaction
import com.sphericalchickens.kokopelli.database.*

import org.jetbrains.exposed.sql.deleteAll

fun Route.testHarnessRoutes() {
    route("/api/test-harness") {
        post("/clear-db") {
            transaction {
                UsersTable.deleteAll()
                AthleteProfilesTable.deleteAll()
                SpiritAnimalsTable.deleteAll()
                CoursesTable.deleteAll()
                CoursePOIsTable.deleteAll()
                CourseSegmentsTable.deleteAll()
                ActivityPlansTable.deleteAll()
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "Database cleared"))
        }
        
        post("/seed-data") {
            // Future: logic to seed test data
            call.respond(HttpStatusCode.OK, mapOf("status" to "Seeded"))
        }
    }
}
