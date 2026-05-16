package com.sphericalchickens.kokopelli.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.HttpStatusCode
import com.sphericalchickens.kokopelli.models.User
import com.sphericalchickens.kokopelli.database.UsersTable
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

fun Route.userRoutes() {
    route("/api/v1/users") {
        get {
            val users = transaction {
                UsersTable.selectAll().map {
                    User(
                        id = it[UsersTable.id],
                        email = it[UsersTable.email],
                        permissionsMask = it[UsersTable.permissionsMask],
                        uiStateJson = it[UsersTable.uiStateJson],
                        createdAt = it[UsersTable.createdAt]
                    )
                }
            }
            call.respond(users)
        }
        
        post {
            val user = call.receive<User>()
            val userId = user.id.ifEmpty { UUID.randomUUID().toString() }
            transaction {
                UsersTable.insert {
                    it[id] = userId
                    it[email] = user.email
                    it[passwordHash] = user.passwordHash
                    it[permissionsMask] = user.permissionsMask
                    it[uiStateJson] = user.uiStateJson
                    it[createdAt] = System.currentTimeMillis()
                }
            }
            call.respond(HttpStatusCode.Created, user.copy(id = userId))
        }
    }
}
