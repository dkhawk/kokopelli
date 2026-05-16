package com.sphericalchickens.kokopelli.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.HttpStatusCode
import com.sphericalchickens.kokopelli.models.Course
import com.sphericalchickens.kokopelli.models.CoursePOI
import com.sphericalchickens.kokopelli.models.CourseSegment
import com.sphericalchickens.kokopelli.database.CoursesTable
import com.sphericalchickens.kokopelli.database.CoursePOIsTable
import com.sphericalchickens.kokopelli.database.CourseSegmentsTable
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

fun Route.courseRoutes() {
    route("/api/v1/courses") {
        post {
            val course = call.receive<Course>()
            val courseId = course.id.ifEmpty { UUID.randomUUID().toString() }
            transaction {
                CoursesTable.insert {
                    it[id] = courseId
                    it[title] = course.title
                    it[totalDistanceMeters] = course.totalDistanceMeters
                    it[totalGainMeters] = course.totalGainMeters
                    it[totalLossMeters] = course.totalLossMeters
                    it[isPublic] = course.isPublic
                    it[createdAt] = System.currentTimeMillis()
                }
            }
            call.respond(HttpStatusCode.Created, course.copy(id = courseId))
        }

        post("{id}/pois") {
            val courseId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val pois = call.receive<List<CoursePOI>>()
            transaction {
                pois.forEach { poi ->
                    val poiId = poi.id.ifEmpty { UUID.randomUUID().toString() }
                    CoursePOIsTable.insert {
                        it[id] = poiId
                        it[CoursesTable.id] = courseId
                        it[name] = poi.name
                        it[latitude] = poi.latitude
                        it[longitude] = poi.longitude
                        it[elevationMeters] = poi.elevationMeters
                        it[sequenceOrder] = poi.sequenceOrder
                        it[isBailoutPoint] = poi.isBailoutPoint
                        it[bailoutBetaNotes] = poi.bailoutBetaNotes
                    }
                }
            }
            call.respond(HttpStatusCode.Created, mapOf("status" to "POIs added"))
        }

        post("{id}/segments") {
            val courseId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val segments = call.receive<List<CourseSegment>>()
            transaction {
                segments.forEach { seg ->
                    val segId = seg.id.ifEmpty { UUID.randomUUID().toString() }
                    CourseSegmentsTable.insert {
                        it[id] = segId
                        it[CoursesTable.id] = courseId
                        it[startPoiId] = seg.startPoiId
                        it[endPoiId] = seg.endPoiId
                        it[distanceMeters] = seg.distanceMeters
                        it[gainMeters] = seg.gainMeters
                        it[lossMeters] = seg.lossMeters
                        it[quantizedPathGeometry] = org.jetbrains.exposed.sql.statements.api.ExposedBlob(seg.quantizedPathGeometry)
                    }
                }
            }
            call.respond(HttpStatusCode.Created, mapOf("status" to "Segments added"))
        }
    }
}
