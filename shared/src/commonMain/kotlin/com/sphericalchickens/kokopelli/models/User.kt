package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val passwordHash: String? = null,
    val permissionsMask: Int = 0,
    val uiStateJson: String = "{}",
    val createdAt: Long = 0L
)
