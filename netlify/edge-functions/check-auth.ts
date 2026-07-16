import type { Context } from "https://edge.netlify.com";

export default async function handler(request: Request, context: Context) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // Check if the path is a restricted page
    const isRestricted = 
        path.includes("members") || 
        path.includes("team-portal") || 
        path.includes("3d-airflow") || 
        path.includes("configurator") || 
        path.includes("corrosion-predictor");

    if (isRestricted) {
        // Parse cookies from Request headers
        const cookieHeader = request.headers.get("cookie") || "";
        const cookies = Object.fromEntries(
            cookieHeader.split(";").map(c => {
                const [key, ...value] = c.trim().split("=");
                return [key, value.join("=")];
            })
        );

        const authCookie = cookies["acnow_auth"];

        // If auth cookie is not set to phase2, redirect to homepage with query param
        if (authCookie !== "phase2") {
            const redirectUrl = new URL("/", request.url);
            redirectUrl.searchParams.set("redirected", "phase2-restricted");
            return Response.redirect(redirectUrl.toString(), 302);
        }
    }

    // Otherwise, serve the page normally
    return await context.next();
}
