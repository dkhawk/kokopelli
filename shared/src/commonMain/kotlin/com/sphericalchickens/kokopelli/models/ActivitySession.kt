package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class ActivitySession(
    val id: String,
    val activityPlanId: String,
    val actualStartTime: Long,
    val actualEndTime: Long? = null,
    val spiritRecapText: String? = null,
    val rawBiometricAnalyticsJson: String = "{}"
)
