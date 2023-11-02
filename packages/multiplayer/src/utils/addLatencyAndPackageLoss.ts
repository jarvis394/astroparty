import { LATENCY_RANGE_END, LATENCY_RANGE_START, SIMULATE_LATENCY } from 'src/config/constants'

export const addLatencyAndPackagesLoss = (f: Function, loss = false) => {
	if (SIMULATE_LATENCY) {
		if (loss && Math.random() > 0.9) return // 10% package loss
		setTimeout(() => f(), LATENCY_RANGE_START + Math.random() * (LATENCY_RANGE_END - LATENCY_RANGE_START)) // random latency
	} else {
		return f()
	}
}
