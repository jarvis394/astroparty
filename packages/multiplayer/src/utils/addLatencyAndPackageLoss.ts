import { SIMULATE_LATENCY } from 'src/config/constants'

export const addLatencyAndPackagesLoss = (f: Function, loss = false) => {
	if (SIMULATE_LATENCY) {
		if (loss && Math.random() > 0.9) return // 10% package loss
		setTimeout(() => f(), 100 + Math.random() * 50) // random latency between 100 and 150
	} else {
		return f()
	}
}
