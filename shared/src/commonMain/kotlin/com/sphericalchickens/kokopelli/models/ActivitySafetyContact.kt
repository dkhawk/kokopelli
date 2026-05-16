package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class ActivitySafetyContact(
    val id: String,
    val activityPlanId: String,
    val safetyUserId: String,
    val shouldReceiveLiveUpdates: Boolean
)
