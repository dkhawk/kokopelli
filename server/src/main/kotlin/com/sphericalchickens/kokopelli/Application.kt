package com.sphericalchickens.kokopelli

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import com.sphericalchickens.kokopelli.database.DatabaseFactory
import com.sphericalchickens.kokopelli.routes.userRoutes
import com.sphericalchickens.kokopelli.routes.courseRoutes
import com.sphericalchickens.kokopelli.routes.activityPlanRoutes
import com.sphericalchickens.kokopelli.routes.telemetryRoutes
import com.sphericalchickens.kokopelli.routes.testHarnessRoutes

fun main() {
    embeddedServer(Netty, port = SERVER_PORT, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module(isTest: Boolean = false) {
    DatabaseFactory.init(isTest)
    
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
        })
    }
    
    routing {
        get("/") {
            call.respondText("Ktor: ${Greeting().greet()}")
        }
        userRoutes()
        courseRoutes()
        activityPlanRoutes()
        telemetryRoutes()
        if (isTest) {
            testHarnessRoutes()
        }
    }
}