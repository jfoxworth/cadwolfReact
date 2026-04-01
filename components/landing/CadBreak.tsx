export default function CadBreak() {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-6 max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          Direct integration with{" "}
          <span className="text-blue-600">Onshape</span> and{" "}
          <span className="text-blue-600">Fusion 360</span>
        </h2>
        <p className="text-gray-600 text-lg mb-8">
          CADWOLF equations can be sent to Onshape and to Fusion 360 to drive CAD models
          and those models can be read back into CADWOLF
        </p>
        <div className="flex justify-center items-center gap-10">
          <img
            src="https://s3-us-west-2.amazonaws.com/cadwolf/stock/Fusion360LogoSmall.png"
            alt="Fusion 360"
            className="h-8"
          />
          <img
            src="https://s3-us-west-2.amazonaws.com/cadwolf/stock/onshapeLogoSmall.png"
            alt="Onshape"
            className="h-8"
          />
        </div>
      </div>
    </section>
  );
}
