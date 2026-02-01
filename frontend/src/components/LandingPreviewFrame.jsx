import Landing from "../pages/Landing.jsx";

function LandingPreviewFrame({ previewData, isMobilePreview }) {
  return (
    <div className="landing-preview-panel">
      <div
        className={`landing-preview-frame ${
          isMobilePreview ? "is-mobile" : "is-desktop"
        }`}
      >
        <div
          className={`landing-preview-scale ${
            isMobilePreview ? "is-mobile" : "is-desktop"
          }`}
        >
          <Landing previewData={previewData} disableFetch />
        </div>
      </div>
    </div>
  );
}

export default LandingPreviewFrame;
