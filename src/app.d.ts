declare global {
	namespace App {
		interface Platform {
			env: {
				RESEND_API_KEY?: string;
				BOOKING_EMAIL?: string;
				BOOKING_FROM?: string;
			};
		}
	}
}

export {};