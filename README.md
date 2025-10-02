# Kavithai Viewer  

This project displays **Kavithai files and their content** stored in Google Drive.  
The data is served through an **App Script endpoint** and rendered using plain **HTML, CSS, and JavaScript**.  

---

## How It Works  

1. **App Script as Data Source**  
   - A Google App Script ( [link](https://script.google.com/) ) acts as an API.  
   - It fetches Kavithai files and content from Google Drive and makes them accessible to the frontend.  

2. **Frontend Rendering**  
   - A simple static site built with HTML, CSS, and JS.  
   - The data from the App Script is dynamically inserted into the page and styled for a clean reading experience.  

3. **CORS Handling**  
   - Direct fetch calls caused **CORS restrictions**.  
   - To avoid this, the project uses a `<script>` tag with **JSONP** style handling instead of fetch.  
   - This allows seamless data loading without CORS issues.  

---

## Notes  

- No frameworks are used — just **vanilla HTML, CSS, and JS**.  
- The App Script is the only backend dependency.  
- All content updates happen automatically whenever new Kavithai files are added to Google Drive.  
