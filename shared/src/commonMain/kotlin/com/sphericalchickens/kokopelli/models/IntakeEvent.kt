package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
enum class IntakeType {
    WATER_ML,
    CALORIES_KCAL,
    ELECTROLYTES_MG
}

@Serializable
data class IntakeEvent(
    val id: String,
    val activitySessionId: String,
    val timestamp: Long,
    val type: IntakeType,
    val amount: Float
)
