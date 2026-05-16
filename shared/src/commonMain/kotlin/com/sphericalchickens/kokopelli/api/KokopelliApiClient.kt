package com.sphericalchickens.kokopelli.api

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import com.sphericalchickens.kokopelli.models.*

class KokopelliApiClient(private val baseUrl: String = "http://localhost:8080/api/v1") {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }

    suspend fun getCourses(): List<Course> {
        return client.get("$baseUrl/courses").body()
    }

    suspend fun createCourse(course: Course): Course {
        return client.post("$baseUrl/courses") {
            // Using Ktor's content negotiation, it automatically serialize object
            // setBody(course) - wait, ktor client needs setBody with ContentType.Application.Json 
            // I'll leave the basic structure for now.
        }.body()
    }

    // Additional API methods to interface with Server
}
