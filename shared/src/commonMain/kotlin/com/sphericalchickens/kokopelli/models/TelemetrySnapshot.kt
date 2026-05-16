package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class TelemetrySnapshot(
    val id: Long,
    val activitySessionId: String,
    val timestamp: Long,
    val latitude: Double,
    val longitude: Double,
    val currentElevationMeters: Float,
    val cumulativeDistanceMeters: Float,
    val currentHeartRate: Int,
    val estimatedFinishTime: Long
)
