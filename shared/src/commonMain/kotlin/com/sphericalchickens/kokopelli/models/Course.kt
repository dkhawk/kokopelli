package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class Course(
    val id: String,
    val title: String,
    val totalDistanceMeters: Float,
    val totalGainMeters: Float,
    val totalLossMeters: Float,
    val isPublic: Boolean,
    val createdAt: Long = 0L
)
