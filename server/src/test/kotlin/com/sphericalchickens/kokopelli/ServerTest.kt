package com.sphericalchickens.kokopelli

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlin.test.*
import kotlinx.serialization.json.*

class ServerTest {
    @Test
    fun testRootEndpoint() = testApplication {
        application {
            module(isTest = true)
        }
        client.get("/").apply {
            assertEquals(HttpStatusCode.OK, status)
            assertTrue(bodyAsText().contains("Ktor:"))
        }
    }

    @Test
    fun testClearDbHarness() = testApplication {
        application {
            module(isTest = true)
        }
        client.post("/api/test-harness/clear-db").apply {
            assertEquals(HttpStatusCode.OK, status)
            assertTrue(bodyAsText().contains("Database cleared"))
        }
    }

    @Test
    fun testCreateUser() = testApplication {
        application {
            module(isTest = true)
        }
        
        // Clear DB first
        client.post("/api/test-harness/clear-db")

        // Create User
        val response = client.post("/api/v1/users") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody("""
                {
                    "id": "",
                    "email": "test@example.com",
                    "permissionsMask": 1,
                    "uiStateJson": "{}",
                    "createdAt": 1000
                }
            """.trimIndent())
        }
        
        assertEquals(HttpStatusCode.Created, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("test@example.com"))
    }

    @Test
    fun testPostTelemetry() = testApplication {
        application {
            module(isTest = true)
        }
        
        client.post("/api/test-harness/clear-db")

        val response = client.post("/api/v1/telemetry") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody("""
                {
                    "id": 0,
                    "activitySessionId": "session-123",
                    "timestamp": 1600000000000,
                    "latitude": 44.8,
                    "longitude": -107.8,
                    "currentElevationMeters": 2000.0,
                    "cumulativeDistanceMeters": 15000.0,
                    "currentHeartRate": 150,
                    "estimatedFinishTime": 1600041400000
                }
            """.trimIndent())
        }
        
        assertEquals(HttpStatusCode.Created, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("session-123"))
    }
}
