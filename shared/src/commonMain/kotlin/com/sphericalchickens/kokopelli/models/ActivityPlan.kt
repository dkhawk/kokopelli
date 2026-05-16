package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
enum class ActivityStatus {
    PLANNED,
    ACTIVE,
    COMPLETED,
    ABORTED
}

@Serializable
data class ActivityPlan(
    val id: String,
    val athleteProfileId: String,
    val courseId: String,
    val spiritAnimalId: String,
    val scheduledStartTime: Long,
    val fitnessCalibrationModifier: Float,
    val uniqueShareToken: String,
    val morningPrepJson: String = "{}",
    val status: ActivityStatus
)
