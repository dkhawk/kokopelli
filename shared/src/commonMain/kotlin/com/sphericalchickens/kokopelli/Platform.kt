package com.sphericalchickens.kokopelli

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform